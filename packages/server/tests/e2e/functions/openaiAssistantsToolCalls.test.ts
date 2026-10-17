import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import { StorageProviderType, TransportType } from '@prisma/client'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import {
  completedRunEvents,
  fakeRun,
  startFakeOpenai,
} from '../../lib/openai/startFakeOpenai'
import { startFakeMcpServer } from '../../lib/mcpServers/startFakeMcpServer'
import { createTestMcpServer } from '../../lib/mcpServers/createTestMcpServer'
import { createTestComputerUseTool } from '../../lib/tools/createTestComputerUseTool'
import { postMessage } from '../../lib/messages/postMessage'
import { assertRunLog } from '../../lib/logs/assertRunLog'
import { waitFor } from '../../lib/async/waitFor'

// The OpenAI Assistants API hands its required_action tool calls to the
// server as-is, so a fake API can send shapes no supercompat adapter emits.
describe('tool calls from OpenAI Assistants storage', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>
  let toolCalls: unknown[] = []

  before(async () => {
    fakeOpenai = await startFakeOpenai({
      handle: ({ request }) => {
        const segments = request.path.split('/').filter(Boolean)
        if (request.method !== 'POST' || segments[2] !== 'runs') {
          return undefined
        }

        const threadId = segments[1]

        if (segments[4] === 'submit_tool_outputs') {
          return {
            type: 'sse',
            events: completedRunEvents({ threadId, text: 'Handled.' }),
          }
        }

        const run = fakeRun({ threadId })
        return {
          type: 'sse',
          events: [
            { event: 'thread.run.created', data: run },
            {
              event: 'thread.run.requires_action',
              data: {
                ...run,
                status: 'requires_action',
                required_action: {
                  type: 'submit_tool_outputs',
                  submit_tool_outputs: { tool_calls: toolCalls },
                },
              },
            },
          ],
        }
      },
    })
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  after(async () => {
    await fakeOpenai.close()
  })

  it('answers malformed, unknown and computer tool calls', async () => {
    const computer = await startFakeMcpServer({
      tools: [
        {
          name: 'computer_call',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      callTool: (): CallToolResult => ({
        content: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }],
      }),
    })

    try {
      const { assistant, publicApiKey } = await createPublicAssistant({
        assistant: {
          storageProviderType: StorageProviderType.OPENAI,
          openaiAssistantId: 'asst_openai',
          modelSlug: 'gpt-fake',
          instructions: '',
        },
      })
      const mcpServer = await createTestMcpServer({
        assistantId: assistant.id,
        transportType: TransportType.SSE,
        url: computer.sseUrl,
      })
      await createTestComputerUseTool({
        assistantId: assistant.id,
        mcpServerId: mcpServer.id,
      })

      toolCalls = [
        { id: 'call_no_function', type: 'function' },
        { id: 'call_file_search', type: 'file_search', file_search: {} },
        { id: 'call_no_computer_call', type: 'computer_call' },
        {
          id: 'call_screenshot',
          type: 'computer_call',
          computer_call: { action: { type: 'screenshot' } },
        },
      ]

      const { status, events } = await postMessage({
        body: {
          assistantId: assistant.id,
          publicApiKey,
          content: 'Use the tools.',
        },
      })

      assert.strictEqual(status, 200)
      const completed = events.findLast(
        ({ event }) => event === 'thread.message.completed',
      )
      assert.strictEqual(completed?.data.content[0].text.value, 'Handled.')

      const [submission] = fakeOpenai.find({
        method: 'POST',
        path: /\/submit_tool_outputs$/,
      })
      assert.deepStrictEqual(submission.body.tool_outputs, [
        { tool_call_id: 'call_no_function', output: 'No function specified' },
        {
          tool_call_id: 'call_file_search',
          output: 'Unknown tool call type: file_search',
        },
        {
          tool_call_id: 'call_no_computer_call',
          output: 'No computer actions provided.',
        },
        {
          tool_call_id: 'call_screenshot',
          output: JSON.stringify({
            type: 'computer_screenshot',
            image_url: 'data:image/png;base64,AAAA',
          }),
          // No pending_safety_checks were sent, so none are acknowledged.
          acknowledged_safety_checks: [],
        },
      ])
      assert.deepStrictEqual(computer.toolCalls, [
        {
          name: 'computer_call',
          arguments: { action: { type: 'screenshot' } },
        },
      ])

      // The computer call's SSE connection is closed after the screenshot.
      await waitFor({ check: () => computer.sseStreams.closed === 1 })
      assert.deepStrictEqual(computer.sseStreams, { opened: 1, closed: 1 })

      await assertRunLog({
        assistant,
        status: 500,
        message: 'No function specified.',
      })
      await assertRunLog({
        assistant,
        status: 500,
        message: 'Unknown tool call type: file_search',
      })
    } finally {
      await computer.close()
    }
  })

  // Runs one message whose run requires `calls`, returning the tool outputs
  // the server submitted back to the fake API.
  const submitToolCalls = async ({ calls }: { calls: unknown[] }) => {
    const { assistant, publicApiKey } = await createPublicAssistant({
      assistant: {
        storageProviderType: StorageProviderType.OPENAI,
        openaiAssistantId: 'asst_openai',
        modelSlug: 'gpt-fake',
        instructions: '',
      },
    })
    toolCalls = calls

    const { status } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        content: 'Use the tool.',
      },
    })
    assert.strictEqual(status, 200)

    const submission = fakeOpenai
      .find({ method: 'POST', path: /\/submit_tool_outputs$/ })
      .at(-1)!

    return { assistant, toolOutputs: submission.body.tool_outputs }
  }

  it('logs function tool calls that name no function', async () => {
    const { assistant, toolOutputs } = await submitToolCalls({
      calls: [{ id: 'call_bare', type: 'function' }],
    })

    assert.deepStrictEqual(toolOutputs, [
      { tool_call_id: 'call_bare', output: 'No function specified' },
    ])
    // The missing function is logged once, against the run's thread.
    await assertRunLog({
      assistant,
      status: 500,
      message: 'No function specified.',
    })
    assert.strictEqual(
      await prisma.log.count({ where: { assistantId: assistant.id } }),
      1,
    )
  })

  it('logs tool calls of a type it cannot handle', async () => {
    const { assistant, toolOutputs } = await submitToolCalls({
      calls: [
        { id: 'call_code', type: 'code_interpreter', code_interpreter: {} },
      ],
    })

    assert.deepStrictEqual(toolOutputs, [
      {
        tool_call_id: 'call_code',
        output: 'Unknown tool call type: code_interpreter',
      },
    ])
    // The unknown type is logged once, against the run's thread.
    await assertRunLog({
      assistant,
      status: 500,
      message: 'Unknown tool call type: code_interpreter',
    })
    assert.strictEqual(
      await prisma.log.count({ where: { assistantId: assistant.id } }),
      1,
    )
  })
})
