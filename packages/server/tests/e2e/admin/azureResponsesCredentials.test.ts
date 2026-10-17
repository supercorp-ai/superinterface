import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { setTimeout as delay } from 'node:timers/promises'
import { after, before, describe, it } from 'node:test'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { startFakeProviderApi } from '../../lib/providerApi/startFakeProviderApi'
import { redirectExternalFetch } from '../../lib/providerApi/redirectExternalFetch'
import { isolateProviderEnv } from '../../lib/providerApi/isolateProviderEnv'

const waitForLog = async ({ assistantId }: { assistantId: string }) => {
  for (let attempt = 0; attempt < 50; attempt++) {
    const log = await prisma.log.findFirst({ where: { assistantId } })
    if (log) return log
    await delay(100)
  }
  return null
}

// Azure AI Project providers authenticate with Azure AD client credentials.
// The authority host points at a closed local port, so token acquisition
// fails without any request leaving the machine.
describe('/api/messages with Azure Responses storage and unusable Azure AD credentials', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeProviderApi>>
  let restoreFetch: () => void
  let restoreEnv: () => void

  before(async () => {
    fakeApi = await startFakeProviderApi()
    restoreFetch = redirectExternalFetch({ origin: fakeApi.origin })
    restoreEnv = isolateProviderEnv({
      env: { AZURE_AUTHORITY_HOST: 'https://127.0.0.1:1' },
    })
  })

  after(async () => {
    restoreEnv()
    restoreFetch()
    await fakeApi.close()
  })

  it('fails to create the thread and logs the error', async () => {
    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.AZURE_AI_PROJECT,
        apiKey: '',
        azureTenantId: 'tenant-id',
        azureClientId: 'client-id',
        azureClientSecret: 'client-secret',
        endpoint: `${fakeApi.origin}/azure-project`,
      },
    })
    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
        azureResponsesAgentName: 'support-agent',
        modelSlug: 'gpt-4o-mini',
      },
    })
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })

    const appHandler = await import('../../../src/app/api/messages/route')

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: assistant.id,
            publicApiKey: publicKey.value,
            content: 'Hi there',
          }),
        })

        assert.strictEqual(response.status, 500)
        assert.deepStrictEqual(await response.json(), {
          error: 'Failed to create thread.',
        })
      },
    })

    const log = await waitForLog({ assistantId: assistant.id })
    assert.ok(log)
    assert.match(log.message, /^Failed to create thread: /)
    assert.strictEqual(log.workspaceId, workspace.id)
    assert.deepStrictEqual(fakeApi.requests, [])
  })
})
