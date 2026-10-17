import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
  ToolType,
  TransportType,
} from '@prisma/client'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestNativeTool } from '../../lib/tools/createTestNativeTool'
import { createTestComputerUseTool } from '../../lib/tools/createTestComputerUseTool'
import { createTestMcpServer } from '../../lib/mcpServers/createTestMcpServer'
import { startFakeMcpServer } from '../../lib/mcpServers/startFakeMcpServer'
import { startFakeAnthropic } from '../../lib/llm/startFakeAnthropic'
import { postMessage } from '../../lib/messages/postMessage'

describe('Anthropic tools and computer use', () => {
  let anthropic: Awaited<ReturnType<typeof startFakeAnthropic>>
  let computer: Awaited<ReturnType<typeof startFakeMcpServer>>

  before(async () => {
    anthropic = await startFakeAnthropic({
      replies: [
        {
          toolUses: [
            {
              name: 'computer',
              input: { action: 'left_click', coordinate: [5, 6] },
            },
          ],
        },
        { content: 'Clicked.' },
      ],
    })
    process.env.ANTHROPIC_BASE_URL = anthropic.baseURL
    computer = await startFakeMcpServer({
      tools: [
        {
          name: 'computer_call',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      callTool: () => ({
        content: [{ type: 'image', data: 'QUJD', mimeType: 'image/png' }],
      }),
    })
  })

  after(async () => {
    await anthropic.close()
    await computer.close()
  })

  it('sends Anthropic native tools and returns screenshots as image blocks', async () => {
    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.ANTHROPIC,
        apiKey: 'sk-ant-test',
      },
    })
    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'claude-fake',
      },
    })
    for (const type of [
      ToolType.FILE_SEARCH,
      ToolType.CODE_INTERPRETER,
      ToolType.IMAGE_GENERATION,
      ToolType.WEB_SEARCH,
    ]) {
      await createTestNativeTool({ assistantId: assistant.id, type })
    }
    const computerMcpServer = await createTestMcpServer({
      assistantId: assistant.id,
      transportType: TransportType.HTTP,
      url: computer.httpUrl,
    })
    await createTestComputerUseTool({
      assistantId: assistant.id,
      mcpServerId: computerMcpServer.id,
      displayWidth: 1280,
      displayHeight: 800,
    })
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })

    const result = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey: publicKey.value,
        content: 'Click it.',
      },
    })

    assert.strictEqual(result.status, 200)
    const [first, second] = anthropic.requests

    // File search and image generation have no Anthropic equivalent.
    const toolTypes = first.body.tools.map(
      ({ type, name }: { type: string; name: string }) => `${type}:${name}`,
    )
    assert.deepStrictEqual(toolTypes.sort(), [
      'code_execution_20250825:code_execution',
      'computer_20250124:computer',
      'web_search_20250305:web_search',
    ])
    const computerTool = first.body.tools.find(
      ({ name }: { name: string }) => name === 'computer',
    )
    assert.strictEqual(computerTool.display_width_px, 1280)
    assert.strictEqual(computerTool.display_height_px, 800)

    assert.strictEqual(computer.toolCalls.length, 1)
    assert.strictEqual(
      (computer.toolCalls[0].arguments?.action as { type: string }).type,
      'click',
    )

    // The screenshot is sent back as an Anthropic image tool result.
    const toolResult = second.body.messages
      .flatMap(({ content }: { content: unknown }) =>
        Array.isArray(content) ? content : [],
      )
      .find(({ type }: { type: string }) => type === 'tool_result')
    assert.deepStrictEqual(toolResult.content, [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: 'QUJD' },
      },
    ])

    const completed = result.events.findLast(
      ({ event }) => event === 'thread.message.completed',
    )
    assert.strictEqual(completed?.data.content[0].text.value, 'Clicked.')
  })
})
