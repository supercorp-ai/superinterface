import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it, mock } from 'node:test'
import {
  MessageRole,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { testApiHandler } from 'next-test-api-route-handler'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { createTestThread } from '../../lib/threads/createTestThread'
import { startFakeOpenai } from '../../lib/openai/startFakeOpenai'
import { getMessages } from '../../lib/messages/getMessages'
import { postMessage } from '../../lib/messages/postMessage'
import { waitForLog } from '../../lib/logs/waitForLog'

const cloudAssistant = () =>
  createPublicAssistant({
    modelProvider: {
      type: ModelProviderType.OLLAMA,
      endpoint: 'http://127.0.0.1:9/v1',
    },
    assistant: {
      storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
    },
  })

const addInitialMessages = ({ assistantId }: { assistantId: string }) =>
  prisma.initialMessage.createMany({
    data: [
      {
        assistantId,
        role: MessageRole.ASSISTANT,
        content: 'Hello, how can I help?',
        orderNumber: 0,
        metadata: { source: 'greeting' },
      },
      {
        assistantId,
        role: MessageRole.USER,
        content: 'Tell me more.',
        orderNumber: 1,
      },
    ],
  })

const pickResult = ({ status, json }: { status: number; json: unknown }) => ({
  status,
  json,
})

describe('GET /api/messages', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>
  let failMessagesList = false

  before(async () => {
    fakeOpenai = await startFakeOpenai({
      handle: ({ request }) => {
        if (!failMessagesList) return undefined
        if (request.method !== 'GET') return undefined
        if (!/^\/threads\/[^/]+\/messages$/.test(request.path)) return undefined

        return {
          type: 'json',
          status: 400,
          json: { error: { message: 'Thread is gone' } },
        }
      },
    })
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  after(async () => {
    await fakeOpenai.close()
  })

  // Runs first so this test is the one that loads the route module.
  it('exports a maxDuration of 800 and serves OPTIONS, GET and POST', async () => {
    const appHandler = await import('../../../src/app/api/messages/route')

    assert.strictEqual(appHandler.maxDuration, 800)
    assert.deepStrictEqual(await getMessages({ query: {} }).then(pickResult), {
      status: 400,
      json: { error: 'Invalid api key' },
    })
    assert.deepStrictEqual(
      await postMessage({ body: { content: 'Hi' } }).then(pickResult),
      { status: 400, json: { error: 'Invalid api key' } },
    )

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'OPTIONS' })

        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(await response.json(), {})
        assert.deepStrictEqual(
          {
            origin: response.headers.get('access-control-allow-origin'),
            methods: response.headers.get('access-control-allow-methods'),
            headers: response.headers.get('access-control-allow-headers'),
          },
          {
            origin: '*',
            methods: 'GET, POST, PUT, DELETE, OPTIONS',
            headers: 'Content-Type, Authorization, X-Requested-With, Accept',
          },
        )
      },
    })
  })

  it('rejects an invalid api key', async () => {
    const { assistant } = await cloudAssistant()

    const queries: Record<string, string>[] = [
      { assistantId: assistant.id },
      { assistantId: assistant.id, publicApiKey: randomUUID() },
    ]

    for (const query of queries) {
      const { status, json } = await getMessages({ query })

      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'Invalid api key' })
    }
  })

  it('requires an assistant id', async () => {
    const { publicApiKey, workspace } = await cloudAssistant()

    const { status, json } = await getMessages({ query: { publicApiKey } })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'No assistant id found' })
    await waitForLog({
      workspaceId: workspace.id,
      message: 'No assistantId found.',
    })
  })

  it('does not find an assistant outside the workspace', async () => {
    const { publicApiKey, workspace } = await cloudAssistant()
    const { assistant: otherAssistant } = await cloudAssistant()

    const { status, json } = await getMessages({
      query: { publicApiKey, assistantId: otherAssistant.id },
    })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'No assistant found' })
    await waitForLog({
      workspaceId: workspace.id,
      message: 'No assistant found.',
    })
  })

  it('returns initial messages when there is no thread yet', async () => {
    const { assistant, publicApiKey } = await cloudAssistant()
    await addInitialMessages({ assistantId: assistant.id })

    const queries: Record<string, string>[] = [
      {},
      { threadId: randomUUID() },
      { threadId: 'not-a-uuid' },
    ]

    for (const extra of queries) {
      const requestedAt = Math.floor(Date.now() / 1000)
      const { status, json, headers } = await getMessages({
        query: { publicApiKey, assistantId: assistant.id, ...extra },
      })

      assert.strictEqual(status, 200)
      // Each response gets its own optimistic thread id shared by its messages.
      const [{ thread_id: threadId }] = json.data
      assert.match(threadId, /^-[A-Za-z0-9]{24}$/)
      assert.deepStrictEqual(
        json.data.map(({ thread_id }: { thread_id: string }) => thread_id),
        [threadId, threadId],
      )
      // Messages are dated one second apart, just before the request.
      const [newest, oldest] = json.data
      assert.ok(Math.abs(newest.created_at - (requestedAt - 1)) <= 2)
      assert.strictEqual(newest.created_at - oldest.created_at, 1)
      // Superinterface Cloud attributes assistant messages to the assistant id.
      assert.strictEqual(oldest.assistant_id, assistant.id)
      assert.strictEqual(headers.get('access-control-allow-origin'), '*')
      assert.strictEqual(json.hasNextPage, false)
      assert.strictEqual(json.lastId, null)
      assert.deepStrictEqual(
        json.data.map(
          ({
            role,
            content,
            assistant_id,
          }: {
            role: string
            content: { text: { value: string } }[]
            assistant_id: string | null
          }) => [role, content[0].text.value, assistant_id],
        ),
        [
          ['user', 'Tell me more.', null],
          ['assistant', 'Hello, how can I help?', assistant.id],
        ],
      )
      assert.ok(json.data[0].created_at > json.data[1].created_at)
      assert.deepStrictEqual(json.data[1].metadata, { source: 'greeting' })
      assert.strictEqual(json.data[0].thread_id, json.data[1].thread_id)
    }
  })

  it('attributes initial assistant messages per storage provider', async () => {
    const cases = [
      {
        assistant: {
          storageProviderType: StorageProviderType.OPENAI,
          openaiAssistantId: 'asst_openai',
        },
        expected: () => 'asst_openai',
      },
      {
        assistant: {
          storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        },
        expected: (id: string) => id,
      },
      {
        assistant: {
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
          azureResponsesAgentName: 'support-agent',
        },
        expected: () => 'support-agent',
      },
      {
        assistant: {
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
        },
        expected: (id: string) => id,
      },
      {
        assistant: {
          storageProviderType: StorageProviderType.AZURE_AGENTS,
          azureAgentsAgentId: 'azure_agent_1',
        },
        expected: () => 'azure_agent_1',
      },
    ]

    for (const { assistant: assistantData, expected } of cases) {
      const { assistant, publicApiKey } = await createPublicAssistant({
        assistant: assistantData,
      })
      await addInitialMessages({ assistantId: assistant.id })

      const { status, json } = await getMessages({
        query: { publicApiKey, assistantId: assistant.id },
      })

      assert.strictEqual(status, 200)
      assert.strictEqual(json.data[1].assistant_id, expected(assistant.id))
    }

    assert.strictEqual(fakeOpenai.requests.length, 0)
  })

  it('returns initial messages for threads without a storage thread', async () => {
    const cases = [
      {
        modelProvider: { type: ModelProviderType.OPENAI },
        assistant: {
          storageProviderType: StorageProviderType.OPENAI,
          openaiAssistantId: 'asst_openai',
        },
      },
      {
        modelProvider: {
          type: ModelProviderType.AZURE_AI_PROJECT,
          endpoint: 'https://example.invalid/api/projects/test',
          azureTenantId: randomUUID(),
          azureClientId: randomUUID(),
          azureClientSecret: 'secret',
        },
        assistant: {
          storageProviderType: StorageProviderType.AZURE_AGENTS,
          azureAgentsAgentId: 'azure_agent_1',
        },
      },
    ]

    for (const { modelProvider, assistant: assistantData } of cases) {
      const { assistant, publicApiKey } = await createPublicAssistant({
        modelProvider,
        assistant: assistantData,
      })
      await addInitialMessages({ assistantId: assistant.id })
      const thread = await createTestThread({
        data: { assistantId: assistant.id },
      })

      const { status, json } = await getMessages({
        query: { publicApiKey, assistantId: assistant.id, threadId: thread.id },
      })

      assert.strictEqual(status, 200)
      assert.strictEqual(json.data.length, 2)
      assert.strictEqual(json.hasNextPage, false)
      assert.strictEqual(json.lastId, null)
      // Initial messages get an optimistic thread id, not the stored thread's.
      const [newest, oldest] = json.data
      assert.match(newest.thread_id, /^-[A-Za-z0-9]{24}$/)
      assert.strictEqual(oldest.thread_id, newest.thread_id)
      assert.notStrictEqual(newest.thread_id, thread.id)
      assert.strictEqual(typeof newest.created_at, 'number')
      assert.strictEqual(newest.created_at - oldest.created_at, 1)
    }

    assert.strictEqual(fakeOpenai.requests.length, 0)
  })

  it('pages through Superinterface Cloud history', async () => {
    const { assistant, publicApiKey } = await cloudAssistant()
    const thread = await createTestThread({
      data: { assistantId: assistant.id },
    })
    const start = Date.now() - 60_000
    const messages = await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        prisma.message.create({
          data: {
            threadId: thread.id,
            role: index % 2 ? MessageRole.ASSISTANT : MessageRole.USER,
            content: [
              { type: 'text', text: { value: `m${index}`, annotations: [] } },
            ] as unknown as PrismaJson.MessageContent,
            createdAt: new Date(start + index * 1000),
          },
        }),
      ),
    )
    const texts = (data: { content: { text: { value: string } }[] }[]) =>
      data.map(({ content }) => content[0].text.value)

    const firstPage = await getMessages({
      query: { publicApiKey, assistantId: assistant.id, threadId: thread.id },
    })

    assert.strictEqual(firstPage.status, 200)
    assert.strictEqual(firstPage.json.hasNextPage, true)
    assert.deepStrictEqual(
      texts(firstPage.json.data),
      Array.from({ length: 20 }, (_, index) => `m${24 - index}`),
    )
    assert.strictEqual(firstPage.json.lastId, messages[5].id)

    const secondPage = await getMessages({
      query: {
        publicApiKey,
        assistantId: assistant.id,
        threadId: thread.id,
        pageParam: firstPage.json.lastId,
      },
    })

    assert.strictEqual(secondPage.json.hasNextPage, false)
    assert.deepStrictEqual(texts(secondPage.json.data), [
      'm4',
      'm3',
      'm2',
      'm1',
      'm0',
    ])

    const newer = await getMessages({
      query: {
        publicApiKey,
        assistantId: assistant.id,
        threadId: thread.id,
        before: messages[22].id,
      },
    })

    assert.strictEqual(newer.status, 200)
    assert.deepStrictEqual(texts(newer.json.data).sort(), ['m23', 'm24'])
  })

  it('reads OpenAI Assistants history and forwards pagination', async () => {
    const { assistant, publicApiKey, workspace } = await createPublicAssistant({
      assistant: {
        storageProviderType: StorageProviderType.OPENAI,
        openaiAssistantId: 'asst_openai',
      },
    })
    const thread = await createTestThread({
      data: { assistantId: assistant.id, openaiThreadId: 'thread_remote' },
    })
    const query = {
      publicApiKey,
      assistantId: assistant.id,
      threadId: thread.id,
    }

    const latest = await getMessages({ query })
    const older = await getMessages({ query: { ...query, pageParam: 'msg_a' } })
    const newer = await getMessages({ query: { ...query, before: 'msg_b' } })

    for (const { status, json } of [latest, older, newer]) {
      assert.strictEqual(status, 200)
      assert.deepStrictEqual(json, {
        data: [],
        hasNextPage: false,
        lastId: null,
      })
    }

    const listRequests = fakeOpenai.find({
      method: 'GET',
      path: '/threads/thread_remote/messages',
    })
    assert.deepStrictEqual(
      listRequests.map(({ query: params }) => [
        params.get('after'),
        params.get('before'),
        params.get('limit'),
      ]),
      [
        [null, null, '20'],
        ['msg_a', null, '20'],
        [null, 'msg_b', '20'],
      ],
    )

    failMessagesList = true
    const consoleDir = mock.method(console, 'dir', () => undefined)
    const failed = await getMessages({ query }).finally(() => {
      consoleDir.mock.restore()
      failMessagesList = false
    })

    assert.strictEqual(failed.status, 500)
    assert.deepStrictEqual(failed.json, { error: 'Failed to load messages.' })
    assert.strictEqual(consoleDir.mock.callCount(), 1)
    const [dumped, options] = consoleDir.mock.calls[0].arguments
    assert.deepStrictEqual(Object.keys(dumped), ['error'])
    assert.strictEqual(dumped.error.status, 400)
    assert.strictEqual(dumped.error.message, '400 Thread is gone')
    assert.deepStrictEqual(options, { depth: null })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to load messages: /,
    })
    assert.match(log.message, /Thread is gone/)
    assert.strictEqual(log.threadId, thread.id)
  })

  it('reads OpenAI Responses history from the conversation', async () => {
    const { assistant, publicApiKey } = await createPublicAssistant({
      assistant: { storageProviderType: StorageProviderType.OPENAI_RESPONSES },
    })
    const thread = await createTestThread({
      data: { assistantId: assistant.id, openaiConversationId: 'conv_remote' },
    })

    const { status, json } = await getMessages({
      query: { publicApiKey, assistantId: assistant.id, threadId: thread.id },
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(json.data, [])
    assert.ok(
      fakeOpenai.find({
        method: 'GET',
        path: '/conversations/conv_remote/items',
      }).length > 0,
    )
  })
})
