import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  ModelProviderType,
  Prisma,
  StorageProviderType,
  TruncationType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { createTestThread } from '../../lib/threads/createTestThread'
import { startFakeOpenai } from '../../lib/openai/startFakeOpenai'
import { postMessage } from '../../lib/messages/postMessage'
import { getMessages } from '../../lib/messages/getMessages'

// Azure OpenAI clients reject OPENAI_BASE_URL alongside an endpoint, so these
// tests point the model provider endpoint at the fake instead.
describe('/api/messages on Azure Responses storage', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>

  before(async () => {
    delete process.env.OPENAI_BASE_URL
    fakeOpenai = await startFakeOpenai()
  })

  after(async () => {
    await fakeOpenai.close()
  })

  const azureAssistant = ({
    assistant = {},
  }: {
    assistant?: Partial<Prisma.AssistantUncheckedCreateInput>
  } = {}) =>
    createPublicAssistant({
      modelProvider: {
        type: ModelProviderType.AZURE_OPENAI,
        endpoint: fakeOpenai.origin,
        apiKey: 'azure-key',
        apiVersion: '2025-04-01-preview',
      },
      assistant: {
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
        modelSlug: 'gpt-fake',
        instructions: '',
        ...assistant,
      },
    })

  const responsesFor = ({ conversationId }: { conversationId: string }) =>
    fakeOpenai
      .find({ method: 'POST', path: '/responses' })
      .filter(({ body }) => body.conversation === conversationId)

  it('runs an agent reference on a new Azure conversation', async () => {
    const { assistant, publicApiKey } = await azureAssistant({
      assistant: {
        azureResponsesAgentName: 'support-agent',
        instructions: 'Ignored in favour of the agent instructions.',
      },
    })

    const { status, events } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 200)
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
    })
    assert.match(thread.azureOpenaiConversationId ?? '', /^conv_/)
    assert.strictEqual(thread.openaiConversationId, null)
    assert.strictEqual(
      events.find(({ event }) => event === 'thread.created')?.data.id,
      thread.azureOpenaiConversationId,
    )

    const [response] = responsesFor({
      conversationId: thread.azureOpenaiConversationId!,
    })
    assert.match(response.rawPath, /^\/openai\//)
    assert.deepStrictEqual(response.body.agent, {
      name: 'support-agent',
      type: 'agent_reference',
    })
    assert.ok(!('instructions' in response.body))
    assert.strictEqual(
      events.find(({ event }) => event === 'thread.run.failed')?.data
        .assistant_id,
      'support-agent',
    )
  })

  it('relies on stored instructions when the assistant has none', async () => {
    const { assistant, publicApiKey } = await azureAssistant({
      assistant: {
        truncationType: TruncationType.LAST_MESSAGES,
        truncationLastMessagesCount: 3,
      },
    })
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
    assert.match(updated.azureOpenaiConversationId ?? '', /^conv_/)
    assert.strictEqual(updated.openaiConversationId, null)

    const [response] = responsesFor({
      conversationId: updated.azureOpenaiConversationId!,
    })
    assert.strictEqual(response.body.model, 'gpt-fake')
    assert.strictEqual(response.body.truncation, 'auto')
    assert.ok(!('instructions' in response.body))
    assert.ok(!('agent' in response.body))
  })

  it('reads history from the Azure conversation', async () => {
    const { assistant, publicApiKey } = await azureAssistant()
    const thread = await createTestThread({
      data: {
        assistantId: assistant.id,
        azureOpenaiConversationId: 'conv_azure_history',
      },
    })

    const { status, json } = await getMessages({
      query: { publicApiKey, assistantId: assistant.id, threadId: thread.id },
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(json.data, [])
    assert.ok(
      fakeOpenai.find({
        method: 'GET',
        path: '/conversations/conv_azure_history/items',
      }).length > 0,
    )
  })
})
