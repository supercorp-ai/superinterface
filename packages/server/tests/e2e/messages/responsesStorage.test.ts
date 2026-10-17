import assert from 'node:assert'
import { after, afterEach, before, describe, it } from 'node:test'
import {
  MessageRole,
  ModelProviderType,
  Prisma,
  StorageProviderType,
  TruncationType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { createTestThread } from '../../lib/threads/createTestThread'
import {
  startFakeOpenai,
  type FakeOpenaiHandler,
} from '../../lib/openai/startFakeOpenai'
import { postMessage } from '../../lib/messages/postMessage'
import { waitForLog } from '../../lib/logs/waitForLog'

describe('POST /api/messages on OpenAI Responses storage', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>
  let override: FakeOpenaiHandler | undefined

  before(async () => {
    fakeOpenai = await startFakeOpenai({
      handle: (args) => override?.(args),
    })
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  afterEach(() => {
    override = undefined
  })

  after(async () => {
    await fakeOpenai.close()
  })

  const responsesAssistant = ({
    assistant = {},
  }: {
    assistant?: Partial<Prisma.AssistantUncheckedCreateInput>
  } = {}) =>
    createPublicAssistant({
      assistant: {
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        modelSlug: 'gpt-fake',
        instructions: '',
        ...assistant,
      },
    })

  const responsesFor = ({ conversationId }: { conversationId: string }) =>
    fakeOpenai
      .find({ method: 'POST', path: '/responses' })
      .filter(({ body }) => body.conversation === conversationId)

  it('creates a conversation with initial messages and runs a response', async () => {
    const { assistant, publicApiKey, workspace } = await responsesAssistant()
    await prisma.initialMessage.create({
      data: {
        assistantId: assistant.id,
        role: MessageRole.ASSISTANT,
        content: 'Welcome!',
        orderNumber: 0,
      },
    })

    const { status, events } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 200)
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
    })
    assert.match(thread.openaiConversationId ?? '', /^conv_/)
    assert.strictEqual(thread.openaiThreadId, null)

    const created = events.find(({ event }) => event === 'thread.created')
    assert.strictEqual(created?.data.id, thread.openaiConversationId)

    const [conversationCreate] = fakeOpenai
      .find({ method: 'POST', path: '/conversations' })
      .filter(({ body }) => body.metadata.threadId === thread.id)
    assert.deepStrictEqual(conversationCreate.body.items, [
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Welcome!' }],
      },
    ])

    const [response] = responsesFor({
      conversationId: thread.openaiConversationId!,
    })
    assert.strictEqual(response.body.model, 'gpt-fake')
    assert.strictEqual(response.body.truncation, 'auto')
    assert.ok(!('instructions' in response.body))
    assert.deepStrictEqual(response.body.input, [
      {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Hi' }],
      },
    ])

    const failed = events.find(({ event }) => event === 'thread.run.failed')
    assert.strictEqual(failed?.data.assistant_id, assistant.id)
    await waitForLog({
      workspaceId: workspace.id,
      message: `Thread Run failed: 404 Unhandled POST /responses (code: server_error) [run: ${failed?.data.id}]`,
    })
  })

  it('sends instructions and truncation for each strategy', async () => {
    const cases = [
      {
        assistant: {
          instructions: 'Answer in French.',
          truncationType: TruncationType.LAST_MESSAGES,
          truncationLastMessagesCount: 2,
        },
        expected: { instructions: 'Answer in French.', truncation: 'auto' },
      },
      {
        assistant: { truncationType: TruncationType.DISABLED },
        expected: { instructions: undefined, truncation: 'disabled' },
      },
    ]

    for (const { assistant: assistantData, expected } of cases) {
      const { assistant, publicApiKey } = await responsesAssistant({
        assistant: assistantData,
      })
      const thread = await createTestThread({
        data: {
          assistantId: assistant.id,
          openaiConversationId: `conv_${assistant.id}`,
        },
      })

      const { status, events } = await postMessage({
        body: {
          assistantId: assistant.id,
          publicApiKey,
          threadId: thread.id,
          content: 'Bonjour',
        },
      })

      assert.strictEqual(status, 200)
      assert.ok(!events.some(({ event }) => event === 'thread.created'))
      const [response] = responsesFor({
        conversationId: thread.openaiConversationId!,
      })
      assert.strictEqual(response.body.instructions, expected.instructions)
      assert.strictEqual(response.body.truncation, expected.truncation)
    }
  })

  it('creates a managed conversation for a thread that has none', async () => {
    const { assistant, publicApiKey } = await responsesAssistant()
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })

    const { status } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: thread.id,
        content: 'Hi',
      },
    })

    assert.strictEqual(status, 200)
    const updated = await prisma.thread.findUniqueOrThrow({
      where: { id: thread.id },
    })
    assert.match(updated.openaiConversationId ?? '', /^conv_/)
    assert.strictEqual(updated.openaiThreadId, null)
    assert.strictEqual(updated.azureOpenaiConversationId, null)
    const [conversationCreate] = fakeOpenai
      .find({ method: 'POST', path: '/conversations' })
      .filter(({ body }) => body.metadata.threadId === thread.id)
    assert.deepStrictEqual(conversationCreate.body.metadata, {
      assistantId: assistant.id,
      threadId: thread.id,
    })
    assert.strictEqual(
      responsesFor({ conversationId: updated.openaiConversationId! }).length,
      1,
    )
  })

  it('sends no tools when the model provider has no function calling', async () => {
    const { assistant, publicApiKey } = await createPublicAssistant({
      modelProvider: { type: ModelProviderType.HUMIRIS },
      assistant: {
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        modelSlug: 'gpt-fake',
        instructions: '',
      },
    })
    await prisma.function.create({
      data: {
        assistantId: assistant.id,
        openapiSpec: { name: 'lookup', parameters: { type: 'object' } },
      },
    })
    const thread = await createTestThread({
      data: {
        assistantId: assistant.id,
        openaiConversationId: `conv_${assistant.id}`,
      },
    })

    const { status } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: thread.id,
        content: 'Hi',
      },
    })

    assert.strictEqual(status, 200)
    const [response] = responsesFor({
      conversationId: thread.openaiConversationId!,
    })
    assert.strictEqual(response.body.model, 'gpt-fake')
    assert.ok(!('tools' in response.body))
  })
})
