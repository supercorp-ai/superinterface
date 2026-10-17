import assert from 'node:assert'
import { describe, it } from 'node:test'
import { Prisma, TransportType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { runFakeToolCalls } from '../../lib/functions/runFakeToolCalls'
import { startFakeMcpServer } from '../../lib/mcpServers/startFakeMcpServer'
import { createTestMcpServer } from '../../lib/mcpServers/createTestMcpServer'
import { waitForAssistantLog } from '../../lib/logs/waitForAssistantLog'
import { assertRunLog } from '../../lib/logs/assertRunLog'
import { waitFor } from '../../lib/async/waitFor'

const echoTool = {
  name: 'echo',
  description: 'Echoes input',
  inputSchema: {
    type: 'object' as const,
    properties: { text: { type: 'string' } },
  },
}

const otherTool = {
  name: 'other',
  description: 'Something else',
  inputSchema: { type: 'object' as const, properties: {} },
}

const withMcpServer = async (
  run: (mcp: Awaited<ReturnType<typeof startFakeMcpServer>>) => Promise<void>,
) => {
  const mcp = await startFakeMcpServer({
    tools: [echoTool],
    callTool: ({ arguments: args }) => ({
      content: [{ type: 'text', text: `echo: ${args?.text}` }],
    }),
  })

  try {
    await run(mcp)
  } finally {
    await mcp.close()
  }
}

describe('MCP server tools during runs', () => {
  it('lists and calls tools over Streamable HTTP with interpolated headers', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'hi' } }],
        body: { tenantId: 'tenant-1' },
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.HTTP,
            url: mcp.httpUrl,
            headers: {
              'X-Tenant': '{{tenantId}}',
              'X-Assistant': '{{assistantId}}',
            },
          })
        },
      })

      assert.strictEqual(result.status, 200)
      assert.deepStrictEqual(result.completionRequests[0].body.tools, [
        {
          type: 'function',
          function: {
            name: 'echo',
            description: 'Echoes input',
            parameters: echoTool.inputSchema,
          },
        },
      ])
      assert.deepStrictEqual(
        result.toolOutputs.map((o) => JSON.parse(o)),
        [{ content: [{ type: 'text', text: 'echo: hi' }] }],
      )
      assert.deepStrictEqual(mcp.toolCalls, [
        { name: 'echo', arguments: { text: 'hi' } },
      ])

      const posted = mcp.requests.filter(({ method }) => method === 'POST')
      assert.ok(posted.length > 0)
      for (const { headers } of posted) {
        assert.strictEqual(headers['x-tenant'], 'tenant-1')
        assert.strictEqual(headers['x-assistant'], result.assistant.id)
        // Thread metadata is forwarded as dashed headers.
        assert.strictEqual(headers['tenant-id'], 'tenant-1')
      }
    })
  })

  it('connects on an existing thread without metadata', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'bare' } }],
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.HTTP,
            url: mcp.httpUrl,
            headers: { 'X-Assistant': '{{assistantId}}' },
          })
          const thread = await prisma.thread.create({
            data: { assistantId: assistant.id, metadata: Prisma.DbNull },
          })
          return { threadId: thread.id }
        },
      })

      assert.deepStrictEqual(
        result.toolOutputs.map((o) => JSON.parse(o)),
        [{ content: [{ type: 'text', text: 'echo: bare' }] }],
      )
      for (const { headers } of mcp.requests) {
        assert.strictEqual(headers['x-assistant'], result.assistant.id)
        assert.strictEqual(headers['thread-id'], undefined)
      }
    })
  })

  it('lists and calls tools over SSE', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'sse' } }],
        body: { region: 'eu' },
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.SSE,
            url: mcp.sseUrl,
            headers: { 'X-Region': '{{region}}' },
          })
        },
      })

      assert.strictEqual(result.status, 200)
      assert.deepStrictEqual(
        result.completionRequests[0].body.tools.map(
          ({ function: fn }: { function: { name: string } }) => fn.name,
        ),
        ['echo'],
      )
      assert.deepStrictEqual(
        result.toolOutputs.map((o) => JSON.parse(o)),
        [{ content: [{ type: 'text', text: 'echo: sse' }] }],
      )
      const sseRequests = mcp.requests.filter(({ path }) => path === '/sse')
      assert.ok(sseRequests.length > 0)
      for (const { headers } of mcp.requests) {
        assert.strictEqual(headers['x-region'], 'eu')
      }
      // Listing the tools and calling one each open an SSE stream, and both
      // connections are closed afterwards.
      await waitFor({ check: () => mcp.sseStreams.closed === 2 })
      assert.deepStrictEqual(mcp.sseStreams, { opened: 2, closed: 2 })
    })
  })

  it('finds the tool on the second of several MCP servers', async () => {
    const first = await startFakeMcpServer({ tools: [otherTool] })
    const third = await startFakeMcpServer({ tools: [echoTool] })

    try {
      await withMcpServer(async (second) => {
        const result = await runFakeToolCalls({
          toolCalls: [{ name: 'echo', arguments: { text: 'two' } }],
          setup: async ({ assistant }) => {
            for (const mcp of [first, second, third]) {
              await createTestMcpServer({
                assistantId: assistant.id,
                transportType: TransportType.SSE,
                url: mcp.sseUrl,
              })
            }
          },
        })

        assert.deepStrictEqual(
          result.completionRequests[0].body.tools
            .map(({ function: fn }: { function: { name: string } }) => fn.name)
            .sort(),
          ['echo', 'echo', 'other'],
        )
        assert.deepStrictEqual(
          result.toolOutputs.map((o) => JSON.parse(o)),
          [{ content: [{ type: 'text', text: 'echo: two' }] }],
        )
        // The first server providing the tool handles the call; the search
        // stops there, so the third server is only connected to for listing.
        assert.strictEqual(first.toolCalls.length, 0)
        assert.deepStrictEqual(second.toolCalls, [
          { name: 'echo', arguments: { text: 'two' } },
        ])
        assert.strictEqual(third.toolCalls.length, 0)
        // The first server is connected to again during the call, found to
        // lack the tool and closed.
        await waitFor({ check: () => first.sseStreams.closed === 2 })
        assert.deepStrictEqual(first.sseStreams, { opened: 2, closed: 2 })
        await waitFor({ check: () => second.sseStreams.closed === 2 })
        assert.deepStrictEqual(second.sseStreams, { opened: 2, closed: 2 })
        assert.deepStrictEqual(third.sseStreams, { opened: 1, closed: 1 })
      })
    } finally {
      await first.close()
      await third.close()
    }
  })

  it('reports an unknown tool when no MCP server provides it', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'missing_tool', arguments: {} }],
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.SSE,
            url: mcp.sseUrl,
          })
        },
      })

      assert.deepStrictEqual(result.toolOutputs, [
        'Function missing_tool not found.',
      ])
      assert.strictEqual(mcp.toolCalls.length, 0)
      // The server without the tool is closed after checking its tools.
      await waitFor({ check: () => mcp.sseStreams.closed === 2 })
      assert.deepStrictEqual(mcp.sseStreams, { opened: 2, closed: 2 })
      await assertRunLog({
        assistant: result.assistant,
        status: 500,
        message: 'Function missing_tool not found.',
      })
    })
  })

  it('returns the MCP error when the tool call fails', async () => {
    await withMcpServer(async (mcp) => {
      mcp.behavior.callTool = () => {
        throw new Error('tool exploded')
      }

      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'x' } }],
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.HTTP,
            url: mcp.httpUrl,
          })
        },
      })

      assert.deepStrictEqual(result.toolOutputs, [
        'Error calling function echo: MCP error -32603: tool exploded',
      ])
      await assertRunLog({
        assistant: result.assistant,
        status: 500,
        message: 'Error calling function echo: MCP error -32603: tool exploded',
      })
    })
  })

  it('rejects invalid JSON arguments for MCP tools', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: '{not json' }],
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.HTTP,
            url: mcp.httpUrl,
          })
        },
      })

      const message =
        "Failed parsing function arguments: Expected property name or '}' in JSON at position 1 (line 1 column 2)"
      assert.deepStrictEqual(result.toolOutputs, [message])
      assert.strictEqual(mcp.toolCalls.length, 0)
      await assertRunLog({ assistant: result.assistant, status: 400, message })
    })
  })

  it('treats empty MCP tool arguments as an empty object', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: '' }],
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.HTTP,
            url: mcp.httpUrl,
          })
        },
      })

      assert.deepStrictEqual(mcp.toolCalls, [{ name: 'echo', arguments: {} }])
      assert.deepStrictEqual(
        result.toolOutputs.map((o) => JSON.parse(o)),
        [{ content: [{ type: 'text', text: 'echo: undefined' }] }],
      )
    })
  })

  it('returns the connection error when the MCP server goes down', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'x' } }],
        beforeToolCalls: () => {
          mcp.behavior.failStatus = 503
        },
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.HTTP,
            url: mcp.httpUrl,
          })
        },
      })

      const message =
        'Error calling function echo: Streamable HTTP error: Error POSTing to endpoint: MCP server unavailable'
      assert.deepStrictEqual(result.toolOutputs, [message])
      await assertRunLog({ assistant: result.assistant, status: 500, message })
    })
  })

  it('returns the listing error when tools/list fails at call time', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'x' } }],
        beforeToolCalls: () => {
          mcp.behavior.listToolsError = 'listing broke'
        },
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.SSE,
            url: mcp.sseUrl,
          })
        },
      })

      const message =
        'Error calling function echo: MCP error -32603: listing broke'
      assert.deepStrictEqual(result.toolOutputs, [message])
      assert.strictEqual(mcp.toolCalls.length, 0)
      await assertRunLog({ assistant: result.assistant, status: 500, message })
      // The connection whose tools/list failed is closed too, like the one
      // used to list the tools for the run.
      await waitFor({ check: () => mcp.sseStreams.closed === 2 })
      assert.deepStrictEqual(mcp.sseStreams, { opened: 2, closed: 2 })
    })
  })

  it('uses a later MCP server even if an earlier one errors', async () => {
    const broken = await startFakeMcpServer({ tools: [otherTool] })

    try {
      await withMcpServer(async (mcp) => {
        const result = await runFakeToolCalls({
          toolCalls: [{ name: 'echo', arguments: { text: 'ok' } }],
          beforeToolCalls: () => {
            broken.behavior.failStatus = 500
          },
          setup: async ({ assistant }) => {
            await createTestMcpServer({
              assistantId: assistant.id,
              transportType: TransportType.HTTP,
              url: broken.httpUrl,
            })
            await createTestMcpServer({
              assistantId: assistant.id,
              transportType: TransportType.HTTP,
              url: mcp.httpUrl,
            })
          },
        })

        assert.deepStrictEqual(
          result.toolOutputs.map((o) => JSON.parse(o)),
          [{ content: [{ type: 'text', text: 'echo: ok' }] }],
        )
      })
    } finally {
      await broken.close()
    }
  })

  it('fails the run when MCP variables are missing', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'x' } }],
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.HTTP,
            url: mcp.httpUrl,
            headers: { Authorization: 'Bearer {{missingToken}}' },
          })
        },
      })

      assert.strictEqual(result.status, 500)
      assert.deepStrictEqual(result.json, {
        error: 'Failed to create run stream.',
      })
      const log = await waitForAssistantLog({
        assistantId: result.assistant.id,
        match: ({ message }) =>
          message === 'Missing variables in MCP server: missingToken',
      })
      // Missing variables are a configuration error, logged as a 400.
      assert.strictEqual(log.status, 400)
      assert.strictEqual(log.level, 'ERROR')
    })
  })

  it('fails the run when MCP URL variables are missing', async () => {
    await withMcpServer(async (mcp) => {
      const result = await runFakeToolCalls({
        toolCalls: [{ name: 'echo', arguments: { text: 'x' } }],
        setup: async ({ assistant }) => {
          await createTestMcpServer({
            assistantId: assistant.id,
            transportType: TransportType.SSE,
            url: `${mcp.origin}/{{missingPath}}`,
          })
        },
      })

      assert.strictEqual(result.status, 500)
      const log = await waitForAssistantLog({
        assistantId: result.assistant.id,
        match: ({ message }) =>
          message === 'Missing variables in MCP server: missingPath',
      })
      // Missing variables are a configuration error, logged as a 400.
      assert.strictEqual(log.status, 400)
      assert.strictEqual(log.level, 'ERROR')
    })
  })

  it('fails the run for STDIO MCP servers', async () => {
    const result = await runFakeToolCalls({
      toolCalls: [{ name: 'echo', arguments: {} }],
      setup: async ({ assistant }) => {
        await prisma.mcpServer.create({
          data: {
            assistantId: assistant.id,
            transportType: TransportType.STDIO,
          },
        })
      },
    })

    assert.strictEqual(result.status, 500)
    assert.deepStrictEqual(result.json, {
      error: 'Failed to create run stream.',
    })
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: 'Failed to create run stream: STDIO transport is not supported.',
    })
  })
})
