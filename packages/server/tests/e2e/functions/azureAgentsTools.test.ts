import assert from 'node:assert'
import { after, before, describe, it } from 'node:test'
import {
  ModelProviderType,
  StorageProviderType,
  ToolType,
} from '@prisma/client'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { createTestNativeTool } from '../../lib/tools/createTestNativeTool'
import { postMessage } from '../../lib/messages/postMessage'
import {
  startFakeHttpsProxy,
  type FakeHttpsRequest,
} from '../../lib/http/startFakeHttpsProxy'

const tenantId = 'fake-tenant'
const projectHost = 'fake-project.services.ai.azure.com'
const projectPath = '/api/projects/fake'
const loginHost = 'login.microsoftonline.com'

// Answers Microsoft Entra ID (client credentials) and the Azure AI Foundry
// Agents API just far enough for a run to be requested.
const azure = ({ request }: { request: FakeHttpsRequest }) => {
  const { host, method, path } = request
  const login = `https://${loginHost}/${tenantId}`

  if (host.startsWith(loginHost)) {
    if (path.endsWith('/openid-configuration')) {
      return {
        status: 200,
        body: {
          token_endpoint: `${login}/oauth2/v2.0/token`,
          authorization_endpoint: `${login}/oauth2/v2.0/authorize`,
          end_session_endpoint: `${login}/oauth2/v2.0/logout`,
          issuer: `${login}/v2.0`,
          jwks_uri: `https://${loginHost}/common/discovery/v2.0/keys`,
        },
      }
    }

    if (path.endsWith('/oauth2/v2.0/token')) {
      return {
        status: 200,
        body: {
          token_type: 'Bearer',
          expires_in: 3600,
          ext_expires_in: 3600,
          access_token: 'fake-azure-token',
        },
      }
    }
  }

  if (host.startsWith(projectHost) && method === 'POST') {
    if (path === `${projectPath}/threads`) {
      return {
        status: 200,
        body: {
          id: 'thread_azure',
          object: 'thread',
          created_at: 0,
          metadata: {},
          tool_resources: null,
        },
      }
    }

    if (path === `${projectPath}/threads/thread_azure/messages`) {
      return {
        status: 200,
        body: {
          id: 'msg_azure',
          object: 'thread.message',
          created_at: 0,
          thread_id: 'thread_azure',
          status: 'completed',
          role: 'user',
          content: [{ type: 'text', text: { value: 'Hi', annotations: [] } }],
          attachments: [],
          metadata: {},
        },
      }
    }
  }

  return {
    status: 400,
    body: { error: { code: 'unsupported', message: `${method} ${path}` } },
  }
}

describe('tools for Azure Agents storage', () => {
  let proxy: Awaited<ReturnType<typeof startFakeHttpsProxy>>

  before(async () => {
    proxy = await startFakeHttpsProxy({ handle: azure })
    // Azure SDK pipelines honor HTTPS_PROXY; the fake uses a self-signed cert.
    process.env.HTTPS_PROXY = proxy.proxyUrl
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  })

  after(async () => {
    await proxy.close()
  })

  it('sends file search and code interpreter as Azure Agents tools', async () => {
    const { assistant, publicApiKey } = await createPublicAssistant({
      modelProvider: {
        type: ModelProviderType.AZURE_AI_PROJECT,
        azureTenantId: tenantId,
        azureClientId: 'fake-client',
        azureClientSecret: 'fake-secret',
        endpoint: `https://${projectHost}${projectPath}`,
      },
      assistant: {
        storageProviderType: StorageProviderType.AZURE_AGENTS,
        azureAgentsAgentId: 'asst_azure',
        modelSlug: 'gpt-4o',
      },
    })
    for (const type of [ToolType.FILE_SEARCH, ToolType.CODE_INTERPRETER]) {
      await createTestNativeTool({ assistantId: assistant.id, type })
    }

    // The fake rejects the run itself; the run request carries the tools.
    const { status } = await postMessage({
      body: { assistantId: assistant.id, publicApiKey, content: 'Hi' },
    })

    assert.strictEqual(status, 200)

    const runRequest = proxy.requests.find(
      ({ host, path }) =>
        host.startsWith(projectHost) &&
        path === `${projectPath}/threads/thread_azure/runs`,
    )!
    assert.strictEqual(
      runRequest.headers.authorization,
      'Bearer fake-azure-token',
    )
    const tools = JSON.parse(runRequest.rawBody).tools
    assert.deepStrictEqual(
      tools.map(({ type }: { type: string }) => type).sort(),
      ['code_interpreter', 'file_search'],
    )
  })
})
