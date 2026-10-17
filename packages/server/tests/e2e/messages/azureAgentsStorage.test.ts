import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import { ModelProviderType, StorageProviderType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import {
  startFakeAzureAiProject,
  type FakeAzureRequest,
  type FakeAzureResponse,
} from '../../lib/azure/startFakeAzureAiProject'
import { postMessage } from '../../lib/messages/postMessage'
import { waitForLog } from '../../lib/logs/waitForLog'

// The fake Azure AI project serves HTTPS with a throwaway self-signed
// certificate. Each test file runs in its own process, so disabling
// verification here does not leak into other tests.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

describe('POST /api/messages on Azure Agents storage', () => {
  let fakeAzure: Awaited<ReturnType<typeof startFakeAzureAiProject>>
  let handle: (request: FakeAzureRequest) => FakeAzureResponse

  before(async () => {
    fakeAzure = await startFakeAzureAiProject({
      handle: (request) => handle(request),
    })
    process.env.AZURE_AUTHORITY_HOST = fakeAzure.origin
  })

  after(async () => {
    await fakeAzure.close()
  })

  it('creates the thread in the Azure project and starts a run there', async () => {
    handle = (request) => {
      if (request.method === 'POST' && request.path.endsWith('/threads')) {
        return {
          status: 200,
          json: {
            id: 'thread_azure',
            object: 'thread',
            created_at: 1700000000,
            metadata: request.body.metadata,
            tool_resources: null,
          },
        }
      }
      if (request.method === 'POST' && request.path.endsWith('/messages')) {
        return {
          status: 200,
          json: {
            id: 'msg_azure',
            object: 'thread.message',
            created_at: 1700000001,
            thread_id: 'thread_azure',
            status: 'completed',
            role: 'user',
            content: [{ type: 'text', text: { value: 'Hi', annotations: [] } }],
            attachments: [],
            metadata: {},
            assistant_id: null,
            run_id: null,
            incomplete_details: null,
            completed_at: null,
            incomplete_at: null,
          },
        }
      }
      return {
        status: 400,
        json: { error: { code: 'bad_request', message: 'Unhandled' } },
      }
    }

    const { assistant, publicApiKey, workspace } = await createPublicAssistant({
      modelProvider: {
        type: ModelProviderType.AZURE_AI_PROJECT,
        endpoint: fakeAzure.endpoint,
        azureTenantId: 'adfs',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
      },
      assistant: {
        storageProviderType: StorageProviderType.AZURE_AGENTS,
        azureAgentsAgentId: 'asst_azure',
      },
    })

    const { status, events } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 200)
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: assistant.id },
    })
    assert.strictEqual(thread.azureAgentsThreadId, 'thread_azure')
    assert.deepStrictEqual(thread.metadata, {
      assistantId: assistant.id,
      threadId: thread.id,
    })

    const created = events.find(({ event }) => event === 'thread.created')
    assert.strictEqual(created?.data.id, 'thread_azure')

    assert.deepStrictEqual(
      fakeAzure
        .projectRequests()
        .map(({ method, path, body }) => ({ method, path, body })),
      [
        {
          method: 'POST',
          path: '/api/projects/test/threads',
          body: {
            metadata: { assistantId: assistant.id, threadId: thread.id },
          },
        },
        {
          method: 'POST',
          path: '/api/projects/test/threads/thread_azure/messages',
          body: { role: 'user', content: 'Hi', metadata: {} },
        },
        {
          method: 'POST',
          path: '/api/projects/test/threads/thread_azure/runs',
          body: { assistant_id: 'asst_azure', tools: [], stream: true },
        },
      ],
    )

    // The fake project rejects the run, which the stream reports as failed.
    const failed = events.find(({ event }) => event === 'thread.run.failed')
    await waitForLog({
      workspaceId: workspace.id,
      message: `Thread Run failed: Unexpected status code: 400 (code: server_error) [run: ${failed?.data.id}]`,
    })
  })
})
