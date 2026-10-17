import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  HandlerType,
  MessageRole,
  ModelProviderType,
  Prisma,
  StorageProviderType,
  TruncationType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestThread } from '../../lib/threads/createTestThread'
import { createTestTask } from '../../lib/tasks/createTestTask'
import { startFakeLlm, type FakeLlmReply } from '../../lib/llm/startFakeLlm'
import { startFakeOpenai } from '../../lib/openai/startFakeOpenai'
import { postMessage } from '../../lib/messages/postMessage'
import { waitForLog } from '../../lib/logs/waitForLog'
import { readMessageEvents } from '../../lib/messages/readMessageEvents'
import { testApiHandler } from 'next-test-api-route-handler'
import type { Thread } from '@prisma/client'

describe('POST /api/messages on Superinterface Cloud storage', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>
  const scripted: Record<string, FakeLlmReply> = {}

  before(async () => {
    fakeLlm = await startFakeLlm({
      respond: ({ request }) => {
        const last = request.body.messages.at(-1)?.content
        if (typeof last === 'string' && scripted[last]) return scripted[last]
        return { content: `Echo: ${JSON.stringify(last)}` }
      },
    })
    fakeOpenai = await startFakeOpenai()
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  after(async () => {
    await fakeLlm.close()
    await fakeOpenai.close()
  })

  const cloudAssistant = ({
    assistant = {},
  }: {
    assistant?: Partial<Prisma.AssistantUncheckedCreateInput>
  } = {}) =>
    createPublicAssistant({
      modelProvider: {
        type: ModelProviderType.OLLAMA,
        endpoint: fakeLlm.baseURL,
      },
      assistant: {
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'fake-model',
        instructions: 'Be brief.',
        ...assistant,
      },
    })

  const llmRequestsFor = ({ content }: { content: string }) =>
    fakeLlm
      .completionRequests()
      .filter(
        ({ body }) =>
          body.messages.at(-1)?.content === content ||
          JSON.stringify(body.messages.at(-1)?.content).includes(content),
      )

  it('creates a thread with variables and initial messages', async () => {
    const { assistant, publicApiKey, workspace } = await cloudAssistant({
      assistant: { instructions: '' },
    })
    await prisma.initialMessage.createMany({
      data: [
        {
          assistantId: assistant.id,
          role: MessageRole.ASSISTANT,
          content: 'Welcome!',
          orderNumber: 0,
        },
      ],
    })

    const { status, events } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        content: 'first-variables',
        name: 'Ada',
        count: 3,
        unserializable: { toString: 'not a function' },
      },
    })

    assert.strictEqual(status, 200)
    const created = events.find(({ event }) => event === 'thread.created')
    assert.ok(created)
    assert.deepStrictEqual(created.data.metadata, {
      name: 'Ada',
      count: '3',
      threadId: created.data.id,
      assistantId: assistant.id,
    })

    const [request] = llmRequestsFor({ content: 'first-variables' })
    assert.deepStrictEqual(request.body.messages, [
      { role: 'assistant', content: 'Welcome!' },
      { role: 'user', content: 'first-variables' },
    ])

    const userMessage = await prisma.message.findFirstOrThrow({
      where: { threadId: created.data.id, role: MessageRole.USER },
    })
    assert.deepStrictEqual(userMessage.metadata, { name: 'Ada', count: '3' })
    await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to serialize key "unserializable": /,
    })
  })

  it('continues the existing assistant thread instead of creating new threads', async () => {
    const { assistant, publicApiKey } = await cloudAssistant()

    const first = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'reuse-1' },
    })
    const threadId = first.events.find(
      ({ event }) => event === 'thread.created',
    )?.data.id

    const second = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId,
        content: 'reuse-2',
      },
    })

    assert.strictEqual(second.status, 200)
    assert.ok(!second.events.some(({ event }) => event === 'thread.created'))
    const [request] = llmRequestsFor({ content: 'reuse-2' })
    assert.deepStrictEqual(
      request.body.messages.map(({ content }: { content: string }) => content),
      ['Be brief.', 'reuse-1', 'Echo: "reuse-1"', 'reuse-2'],
    )
    assert.strictEqual(
      await prisma.thread.count({ where: { assistantId: assistant.id } }),
      1,
    )
  })

  it('starts a new thread when the thread id is not a uuid', async () => {
    const { assistant, publicApiKey } = await cloudAssistant()

    const { status, events } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: 'not-a-uuid',
        content: 'invalid-thread-id',
      },
    })

    assert.strictEqual(status, 200)
    const created = events.find(({ event }) => event === 'thread.created')
    assert.ok(created)
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
    })
    assert.strictEqual(created.data.id, thread.id)
  })

  it('truncates history to the last messages', async () => {
    const { assistant, publicApiKey } = await cloudAssistant({
      assistant: {
        truncationType: TruncationType.LAST_MESSAGES,
        truncationLastMessagesCount: 1,
      },
    })

    const first = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'trunc-1' },
    })
    const threadId = first.events.find(
      ({ event }) => event === 'thread.created',
    )?.data.id
    await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId,
        content: 'trunc-2',
      },
    })

    const [request] = llmRequestsFor({ content: 'trunc-2' })
    assert.deepStrictEqual(
      request.body.messages.map(({ content }: { content: string }) => content),
      ['Be brief.', 'trunc-2'],
    )
  })

  it('keeps full history when truncation is disabled', async () => {
    const { assistant, publicApiKey } = await cloudAssistant({
      assistant: { truncationType: TruncationType.DISABLED },
    })

    const first = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'notrunc-1' },
    })
    const threadId = first.events.find(
      ({ event }) => event === 'thread.created',
    )?.data.id
    await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId,
        content: 'notrunc-2',
      },
    })

    const [request] = llmRequestsFor({ content: 'notrunc-2' })
    assert.strictEqual(request.body.messages.length, 4)
  })

  it('reports a failed run when the model errors', async () => {
    const { assistant, publicApiKey, workspace } = await cloudAssistant()
    scripted['llm-error'] = { status: 400, error: 'Model exploded' }

    const { status, events } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'llm-error' },
    })

    assert.strictEqual(status, 200)
    const failed = events.find(({ event }) => event === 'thread.run.failed')
    assert.ok(failed)
    assert.ok(!events.some(({ event }) => event === 'thread.message.completed'))
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Thread Run failed: /,
    })
    assert.match(log.message, /Model exploded/)
    assert.ok(
      log.message.endsWith(`(code: server_error) [run: ${failed.data.id}]`),
    )
    const run = await prisma.run.findUniqueOrThrow({
      where: { id: failed.data.id },
    })
    assert.strictEqual(run.status, 'FAILED')
  })

  it('transcribes audio content with the workspace OpenAI provider', async () => {
    const { assistant, publicApiKey, workspace } = await cloudAssistant()
    await createTestModelProvider({
      data: { workspaceId: workspace.id, type: ModelProviderType.OPENAI },
    })

    const { status } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        audioContent: `data:audio/mp3;base64,${Buffer.from('audio').toString('base64')}`,
      },
    })

    assert.strictEqual(status, 200)
    const [transcription] = fakeOpenai.find({
      method: 'POST',
      path: '/audio/transcriptions',
    })
    assert.ok(transcription.body.includes('whisper-1'))
    assert.ok(transcription.body.includes('audio'))
    assert.strictEqual(
      llmRequestsFor({ content: 'Transcribed audio.' }).length,
      1,
    )

    for (const audioContent of ['data:audio/mp3;base64,', 'no-comma']) {
      await postMessage({
        body: { assistantId: assistant.id, publicApiKey, audioContent },
      })
    }

    assert.strictEqual(
      fakeOpenai.find({ method: 'POST', path: '/audio/transcriptions' }).length,
      1,
    )
    const placeholders = await prisma.message.findMany({
      where: { thread: { assistantId: assistant.id }, role: MessageRole.USER },
    })
    assert.strictEqual(
      placeholders.filter(({ content }) =>
        JSON.stringify(content).includes('"value":"-"'),
      ).length,
      2,
    )
  })

  it('notifies the embedding app when it creates a thread', async () => {
    const { assistant, publicApiKey } = await cloudAssistant()
    const { buildPOST } = await import(
      '../../../src/app/api/messages/buildRoute'
    )
    const createdThreads: Thread[] = []
    const POST = buildPOST({
      prisma,
      onSuccessCreateThread: ({ thread }) => {
        createdThreads.push(thread)
      },
    })

    await testApiHandler({
      appHandler: { POST },
      test: async ({ fetch }) => {
        for (const content of ['callback-1', 'callback-2']) {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assistantId: assistant.id,
              publicApiKey,
              content,
              ...(createdThreads[0] ? { threadId: createdThreads[0].id } : {}),
            }),
          })
          assert.strictEqual(response.status, 200)
          await readMessageEvents({ response })
        }
      },
    })

    assert.deepStrictEqual(
      createdThreads.map(({ assistantId }) => assistantId),
      [assistant.id],
    )
  })

  it('delegates to another assistant and returns its text as tool output', async () => {
    const { assistant, publicApiKey, workspace, modelProvider } =
      await cloudAssistant()
    const expert = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'fake-model',
      },
    })
    await prisma.function.create({
      data: {
        assistantId: assistant.id,
        openapiSpec: {
          name: 'ask_expert',
          description: 'Ask the expert assistant.',
          parameters: {
            type: 'object',
            properties: { message: { type: 'string' } },
            required: ['message'],
          },
        },
        handler: {
          create: {
            type: HandlerType.ASSISTANT,
            assistantHandler: { create: { assistantId: expert.id } },
          },
        },
      },
    })
    scripted['delegate-question'] = {
      toolCalls: [
        { name: 'ask_expert', arguments: { message: 'expert-question' } },
      ],
    }
    scripted['expert-question'] = { content: 'Four.' }

    const { status, events } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        content: 'delegate-question',
      },
    })

    assert.strictEqual(status, 200)
    const finalRequest = fakeLlm
      .completionRequests()
      .find(({ body }) => body.messages.at(-1)?.role === 'tool')
    assert.strictEqual(finalRequest?.body.messages.at(-1).content, 'Four.')
    const finalMessage = events
      .filter(({ event }) => event === 'thread.message.completed')
      .at(-1)
    assert.strictEqual(
      finalMessage?.data.content[0].text.value,
      'Echo: "Four."',
    )
  })

  it('tells the model when a new task would clash with a scheduled one', async () => {
    const { assistant, publicApiKey } = await cloudAssistant()
    await prisma.function.create({
      data: {
        assistantId: assistant.id,
        openapiSpec: {
          name: 'create_task',
          description: 'Schedule a task.',
          parameters: { type: 'object', properties: {} },
        },
        handler: {
          create: {
            type: HandlerType.CREATE_TASK,
            createTaskHandler: { create: { keyTemplate: '' } },
          },
        },
      },
    })
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await createTestTask({
      data: { threadId: thread.id, schedule: { start: start.toISOString() } },
    })
    scripted['schedule-clash'] = {
      toolCalls: [
        {
          name: 'create_task',
          arguments: {
            title: 'Reminder',
            message: 'Ping me',
            schedule: {
              start: new Date(start.getTime() + 5 * 60 * 1000).toISOString(),
            },
          },
        },
      ],
    }

    const { status } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: thread.id,
        content: 'schedule-clash',
      },
    })

    assert.strictEqual(status, 200)
    const toolRequest = fakeLlm
      .completionRequests()
      .find(
        ({ body }) =>
          body.messages.some(
            ({ content }: { content: unknown }) => content === 'schedule-clash',
          ) && body.messages.at(-1)?.role === 'tool',
      )
    assert.strictEqual(
      toolRequest?.body.messages.at(-1).content,
      'Tasks sharing a key and thread must be scheduled at least 15 minutes apart.',
    )
    assert.strictEqual(
      await prisma.task.count({ where: { threadId: thread.id } }),
      1,
    )
  })
})
