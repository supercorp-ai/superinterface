import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestThread } from '../../lib/threads/createTestThread'
import { startFakeOpenai } from '../../lib/openai/startFakeOpenai'
import { postMessage } from '../../lib/messages/postMessage'
import { waitForLog } from '../../lib/logs/waitForLog'
import { waitFor } from '../../lib/async/waitFor'

describe('POST /api/messages request validation', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>

  before(async () => {
    fakeOpenai = await startFakeOpenai()
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  after(async () => {
    await fakeOpenai.close()
  })

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

  it('rejects a missing, malformed, unknown or private api key', async () => {
    const { assistant, workspace } = await cloudAssistant()
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })

    for (const publicApiKey of [
      undefined,
      'not-a-uuid',
      randomUUID(),
      privateKey.value,
    ]) {
      const { status, json } = await postMessage({
        body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
      })

      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'Invalid api key' })
    }
  })

  it('requires an assistant id and logs the error in a waitUntil promise that must resolve to true', async () => {
    const { publicApiKey, workspace } = await cloudAssistant()
    // Stands in for the Vercel runtime, which keeps the function alive until
    // the promises handed to waitUntil settle.
    const requestContext = Symbol.for('@vercel/request-context')
    const waitUntilPromises: Promise<unknown>[] = []
    Object.assign(globalThis, {
      [requestContext]: {
        get: () => ({
          waitUntil: (promise: Promise<unknown>) => {
            waitUntilPromises.push(promise)
          },
        }),
      },
    })

    const { status, json } = await postMessage({
      body: { publicApiKey, content: 'Hi' },
    }).finally(() => Reflect.deleteProperty(globalThis, requestContext))

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'No assistantId found.' })
    assert.strictEqual(waitUntilPromises.length, 1)
    assert.strictEqual(await waitUntilPromises[0], true)
    const logs = await prisma.log.findMany({
      where: { workspaceId: workspace.id },
    })
    assert.deepStrictEqual(
      logs.map(({ message, status, level, requestMethod, requestRoute }) => ({
        message,
        status,
        level,
        requestMethod,
        requestRoute,
      })),
      [
        {
          message: 'No assistantId found.',
          status: 400,
          level: 'ERROR',
          requestMethod: 'POST',
          requestRoute: 'MESSAGES',
        },
      ],
    )
  })

  it('requires text, audio or attachments', async () => {
    const { assistant, publicApiKey, workspace } = await cloudAssistant()

    for (const extra of [{}, { attachments: [] }, { content: '' }]) {
      const { status, json } = await postMessage({
        body: { assistantId: assistant.id, publicApiKey, ...extra },
      })

      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'No content found.' })
    }

    await waitForLog({
      workspaceId: workspace.id,
      message: 'No content found.',
    })
    assert.strictEqual(
      await prisma.thread.count({ where: { assistantId: assistant.id } }),
      0,
    )
  })

  it('accepts attachments without text but then fails to build content', async (t) => {
    const { assistant, publicApiKey, workspace } = await cloudAssistant()
    const consoleError = t.mock.method(console, 'error', () => undefined)

    const { status, json } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        attachments: [{ file_id: 'file-1', tools: [] }],
      },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, { error: 'Failed to get content.' })
    const [[contentError]] = consoleError.mock.calls.map(
      ({ arguments: args }) => args,
    )
    assert.ok(contentError instanceof Error)
    assert.strictEqual(contentError.message, 'No content found')
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to get content/,
    })
    assert.strictEqual(log.message, 'Failed to get content: No content found')
    assert.strictEqual(log.assistantId, assistant.id)
    assert.ok(log.threadId)
  })

  it('does not find an assistant from another workspace', async () => {
    const { publicApiKey, workspace } = await cloudAssistant()
    const { assistant: otherAssistant } = await cloudAssistant()

    for (const assistantId of [otherAssistant.id, randomUUID()]) {
      const { status, json } = await postMessage({
        body: { assistantId, publicApiKey, content: 'Hi' },
      })

      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'No assistant found.' })
    }

    await waitForLog({
      workspaceId: workspace.id,
      message: 'No assistant found.',
    })
  })

  it('rejects OpenAI assistants storage that has no OpenAI assistant yet', async () => {
    const { assistant, publicApiKey, workspace } = await createPublicAssistant({
      assistant: {
        storageProviderType: StorageProviderType.OPENAI,
        openaiAssistantId: null,
      },
    })

    const { status, json } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'Assistant setup is not done.' })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: 'Assistant setup is not done.',
    })
    assert.strictEqual(log.assistantId, assistant.id)
    assert.strictEqual(fakeOpenai.requests.length, 0)
  })

  it('uses the existing assistant thread even when it has no storage thread id', async () => {
    const { assistant, publicApiKey, workspace } = await createPublicAssistant({
      modelProvider: { type: ModelProviderType.AZURE_AI_PROJECT },
      assistant: {
        storageProviderType: StorageProviderType.AZURE_AGENTS,
        azureAgentsAgentId: 'agent_1',
      },
    })
    const thread = await createTestThread({
      data: { assistantId: assistant.id, azureAgentsThreadId: null },
    })

    const { status, json } = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        threadId: thread.id,
        content: 'Hi',
      },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, { error: 'Invalid thread configuration.' })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: 'Invalid thread configuration.',
    })
    assert.strictEqual(log.threadId, thread.id)
    const threads = await prisma.thread.findMany({
      where: { assistantId: assistant.id },
    })
    assert.deepStrictEqual(
      threads.map(({ id }) => id),
      [thread.id],
    )
  })

  it('fails to create an Azure Agents thread when the project rejects it', async (t) => {
    const { assistant, publicApiKey, workspace } = await createPublicAssistant({
      modelProvider: {
        type: ModelProviderType.AZURE_AI_PROJECT,
        // Plain http makes the Azure SDK refuse to send bearer tokens, so the
        // request fails locally before any network call.
        endpoint: 'http://127.0.0.1:9/api/projects/test',
        azureTenantId: randomUUID(),
        azureClientId: randomUUID(),
        azureClientSecret: 'secret',
      },
      assistant: {
        storageProviderType: StorageProviderType.AZURE_AGENTS,
        azureAgentsAgentId: 'agent_1',
      },
    })

    const consoleDir = t.mock.method(console, 'dir', () => undefined)

    const { status, json } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 500)
    assert.deepStrictEqual(json, { error: 'Failed to create thread.' })
    const log = await waitForLog({
      workspaceId: workspace.id,
      message: /^Failed to create thread: /,
    })
    assert.strictEqual(log.assistantId, assistant.id)
    assert.strictEqual(consoleDir.mock.callCount(), 1)
    const [threadError, options] = consoleDir.mock.calls[0].arguments
    assert.ok(threadError instanceof Error)
    assert.strictEqual(
      log.message,
      `Failed to create thread: ${threadError.message}`,
    )
    assert.deepStrictEqual(options, { depth: null })
  })

  it('cannot transcribe audio without an OpenAI api key in the workspace', async (t) => {
    const { assistant, publicApiKey, workspace } = await cloudAssistant()
    const consoleError = t.mock.method(console, 'error', () => undefined)

    const withoutProvider = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        audioContent: 'data:audio/mp3;base64,AAAA',
      },
    })

    assert.strictEqual(withoutProvider.status, 500)
    assert.deepStrictEqual(withoutProvider.json, {
      error: 'Failed to get content.',
    })

    await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.OPENAI,
        apiKey: '',
      },
    })

    const withEmptyKey = await postMessage({
      body: {
        assistantId: assistant.id,
        publicApiKey,
        audioContent: 'data:audio/mp3;base64,AAAA',
      },
    })

    // Audio alone passes validation, finds the assistant and creates a thread,
    // and only then fails while transcribing.
    assert.deepStrictEqual(
      [withoutProvider, withEmptyKey].map(({ status, json }) => ({
        status,
        json,
      })),
      [
        { status: 500, json: { error: 'Failed to get content.' } },
        { status: 500, json: { error: 'Failed to get content.' } },
      ],
    )
    const threads = await prisma.thread.findMany({
      where: { assistantId: assistant.id },
    })
    assert.strictEqual(threads.length, 2)
    const logs = await waitFor({
      check: async () => {
        const rows = await prisma.log.findMany({
          where: { workspaceId: workspace.id },
        })
        return rows.length === 2 ? rows : null
      },
    })
    assert.deepStrictEqual(
      logs.map(({ message, assistantId }) => ({ message, assistantId })),
      [
        {
          message: 'Failed to get content: No OpenAI API key found',
          assistantId: assistant.id,
        },
        {
          message: 'Failed to get content: No OpenAI API key found',
          assistantId: assistant.id,
        },
      ],
    )
    assert.strictEqual(
      fakeOpenai.find({ method: 'POST', path: '/audio/transcriptions' }).length,
      0,
    )
    assert.deepStrictEqual(
      consoleError.mock.calls.map(({ arguments: [error] }) => [
        error instanceof Error,
        error.message,
      ]),
      [
        [true, 'No OpenAI API key found'],
        [true, 'No OpenAI API key found'],
      ],
    )
  })
})
