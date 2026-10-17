import assert from 'node:assert'
import { describe, it } from 'node:test'
import { ToolType, TransportType } from '@prisma/client'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { runFakeToolCalls } from '../../lib/functions/runFakeToolCalls'
import {
  startFakeMcpServer,
  type FakeMcpToolCall,
} from '../../lib/mcpServers/startFakeMcpServer'
import { createTestMcpServer } from '../../lib/mcpServers/createTestMcpServer'
import { createTestComputerUseTool } from '../../lib/tools/createTestComputerUseTool'
import { createTestNativeTool } from '../../lib/tools/createTestNativeTool'
import { assertRunLog } from '../../lib/logs/assertRunLog'
import { waitFor } from '../../lib/async/waitFor'
import type { FakeLlmToolCall } from '../../lib/llm/startFakeLlm'

const screenshot = ({ data }: { data: string }): CallToolResult => ({
  content: [{ type: 'image', data, mimeType: 'image/png' }],
})

const computerCallTool = {
  name: 'computer_call',
  description: 'Runs a computer action',
  inputSchema: { type: 'object' as const, properties: {} },
}

// Runs a message whose fake model emits a `computer_call` with `args`,
// against an assistant whose computer use tool is backed by a fake MCP
// computer that answers with `callTool`.
const runComputerCall = async ({
  args,
  callTool,
  withComputer = true,
  transportType = TransportType.HTTP,
  beforeToolCalls,
}: {
  args: FakeLlmToolCall['arguments']
  callTool: (call: FakeMcpToolCall) => CallToolResult
  withComputer?: boolean
  transportType?: TransportType
  beforeToolCalls?: (computer: {
    behavior: { failStatus: number | null }
  }) => void
}) => {
  const computer = await startFakeMcpServer({
    tools: [computerCallTool],
    callTool,
  })

  try {
    const result = await runFakeToolCalls({
      toolCalls: [{ name: 'computer_call', arguments: args }],
      beforeToolCalls: () => beforeToolCalls?.(computer),
      setup: async ({ assistant }) => {
        if (!withComputer) return
        const mcpServer = await createTestMcpServer({
          assistantId: assistant.id,
          transportType,
          url:
            transportType === TransportType.SSE
              ? computer.sseUrl
              : computer.httpUrl,
        })
        await createTestComputerUseTool({
          assistantId: assistant.id,
          mcpServerId: mcpServer.id,
        })
      },
    })

    // The computer's SSE stream (if any) is closed once the call is handled.
    await waitFor({
      check: () => computer.sseStreams.closed === computer.sseStreams.opened,
    })

    return {
      ...result,
      computerCalls: computer.toolCalls,
      sseStreams: { ...computer.sseStreams },
    }
  } finally {
    await computer.close()
  }
}

const followUpMessages = ({
  completionRequests,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completionRequests: any[]
}) => completionRequests[1].body.messages

describe('computer use calls', () => {
  it('gives the model a computer tool and returns the action screenshot', async () => {
    const result = await runComputerCall({
      args: {
        action: { type: 'click', x: 10, y: 20, button: 'left' },
        pending_safety_checks: [
          { id: 'sc_1' },
          { code: 'no-id' },
          'note',
          null,
        ],
      },
      callTool: () => screenshot({ data: 'AAAA' }),
      transportType: TransportType.SSE,
    })

    assert.strictEqual(result.status, 200)
    // One SSE connection to the computer, closed after the action.
    assert.deepStrictEqual(result.sseStreams, { opened: 1, closed: 1 })
    // Only the computer tool is offered; its MCP server is not listed.
    const tools = result.completionRequests[0].body.tools
    assert.deepStrictEqual(
      tools.map(({ function: fn }: { function: { name: string } }) => fn.name),
      ['computer_call'],
    )
    assert.match(tools[0].function.description, /1024x768/)

    assert.deepStrictEqual(result.computerCalls, [
      {
        name: 'computer_call',
        arguments: { action: { type: 'click', x: 10, y: 20, button: 'left' } },
      },
    ])

    // The screenshot goes back to the model as an image message.
    const messages = followUpMessages(result)
    const toolMessage = messages.find(
      ({ role }: { role: string }) => role === 'tool',
    )
    assert.strictEqual(toolMessage.content, '')
    const imageMessage = messages.at(-1)
    assert.strictEqual(imageMessage.role, 'user')
    assert.deepStrictEqual(imageMessage.content, [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
    ])
  })

  it('takes a screenshot when the action returns no image', async () => {
    const result = await runComputerCall({
      args: { action: { type: 'type', text: 'hello' } },
      callTool: ({ arguments: args }) => {
        const action = args?.action as { type: string }
        if (action.type === 'screenshot') return screenshot({ data: 'BBBB' })
        return { content: [{ type: 'text', text: 'typed' }] }
      },
    })

    assert.deepStrictEqual(
      result.computerCalls.map(({ arguments: args }) => args),
      [
        { action: { type: 'type', text: 'hello' } },
        { action: { type: 'screenshot' } },
      ],
    )
    const imageMessage = followUpMessages(result).at(-1)
    assert.deepStrictEqual(imageMessage.content, [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,BBBB' } },
    ])
  })

  it('returns structured content when no screenshot is available', async () => {
    const result = await runComputerCall({
      args: { action: { type: 'wait' } },
      callTool: () => ({
        content: [{ type: 'text', text: 'no display' }],
        structuredContent: { display: 'off' },
      }),
    })

    // The action has no image and neither has the follow-up screenshot.
    assert.deepStrictEqual(
      result.computerCalls.map(({ arguments: args }) => args),
      [{ action: { type: 'wait' } }, { action: { type: 'screenshot' } }],
    )
    assert.deepStrictEqual(
      result.toolMessages.map(({ content }) => content),
      [{ display: 'off' }],
    )
  })

  it('returns text content when no screenshot or structured content exists', async () => {
    const result = await runComputerCall({
      args: { action: { type: 'wait' } },
      callTool: () => ({ content: [{ type: 'text', text: 'still loading' }] }),
    })

    assert.deepStrictEqual(
      result.computerCalls.map(({ arguments: args }) => args),
      [{ action: { type: 'wait' } }, { action: { type: 'screenshot' } }],
    )
    assert.deepStrictEqual(
      result.toolMessages.map(({ content }) => content),
      [[{ type: 'text', text: 'still loading' }]],
    )
  })

  it('reports calls without a usable action', async () => {
    const result = await runComputerCall({
      // An array of actions is not a single action object.
      args: { action: [{ type: 'click', x: 1, y: 1 }] },
      callTool: () => screenshot({ data: 'CCCC' }),
    })

    assert.deepStrictEqual(result.toolOutputs, [
      'No computer actions provided.',
    ])
    assert.strictEqual(result.computerCalls.length, 0)
  })

  it('reports computer calls when no computer is configured', async () => {
    const result = await runComputerCall({
      args: { action: { type: 'screenshot' } },
      callTool: () => screenshot({ data: 'DDDD' }),
      withComputer: false,
    })

    assert.deepStrictEqual(result.toolOutputs, [
      'No computer use tool configured.',
    ])
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: 'No computer use tool configured.',
    })
  })

  it('reports computer calls when the computer tool has no MCP server', async () => {
    const result = await runFakeToolCalls({
      toolCalls: [
        {
          name: 'computer_call',
          arguments: { action: { type: 'screenshot' } },
        },
      ],
      setup: async ({ assistant }) => {
        // Native tools without an Ollama equivalent are not offered either.
        for (const type of [
          ToolType.FILE_SEARCH,
          ToolType.CODE_INTERPRETER,
          ToolType.IMAGE_GENERATION,
          ToolType.WEB_SEARCH,
        ]) {
          await createTestNativeTool({ assistantId: assistant.id, type })
        }
        await createTestComputerUseTool({
          assistantId: assistant.id,
          mcpServerId: null,
        })
      },
    })

    // An unconfigured computer tool is not offered to the model.
    assert.strictEqual(result.completionRequests[0].body.tools, undefined)
    assert.deepStrictEqual(result.toolOutputs, [
      'No computer use tool configured.',
    ])
    await assertRunLog({
      assistant: result.assistant,
      status: 500,
      message: 'No computer use tool configured.',
    })
  })

  it('returns the MCP error when the computer action fails', async () => {
    const result = await runComputerCall({
      args: { action: { type: 'click', x: 1, y: 2 } },
      callTool: () => {
        throw new Error('display crashed')
      },
      transportType: TransportType.SSE,
    })

    const message =
      'Error calling computer_call with action {"type":"click","x":1,"y":2}: MCP error -32603: display crashed'
    assert.deepStrictEqual(result.toolOutputs, [message])
    await assertRunLog({ assistant: result.assistant, status: 500, message })
    // The computer connection is closed even though the action failed.
    assert.deepStrictEqual(result.sseStreams, { opened: 1, closed: 1 })
  })

  it('returns the connection error when the computer is down', async () => {
    const result = await runComputerCall({
      args: { action: { type: 'screenshot' } },
      callTool: () => screenshot({ data: 'EEEE' }),
      beforeToolCalls: (computer) => {
        computer.behavior.failStatus = 502
      },
    })

    const message =
      'Error calling computer_call with action {"type":"screenshot"}: Streamable HTTP error: Error POSTing to endpoint: MCP server unavailable'
    assert.deepStrictEqual(result.toolOutputs, [message])
    assert.strictEqual(result.computerCalls.length, 0)
    await assertRunLog({ assistant: result.assistant, status: 500, message })
  })
})
