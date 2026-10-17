import { inject } from 'vitest'
import { postServerApi } from './postServerApi'
import { FAKE_OPENAI_API_KEY_PREFIX } from './startOpenaiRouter'

// Sets up a workspace, keys, an OpenAI model provider whose API key routes
// the server's OpenAI calls to `openaiBaseUrl` (e.g. a fake Assistants API,
// see startOpenaiRouter) and an assistant stored on OpenAI Assistants, all
// through the server's public API.
export const createOpenaiAssistantsTestAssistant = async ({
  openaiBaseUrl,
}: {
  openaiBaseUrl: string
}) => {
  const { organizationApiKey } = inject('testServer')

  const { workspace } = await postServerApi({
    path: '/workspaces',
    apiKey: organizationApiKey,
    body: { name: 'E2E OpenAI Assistants Workspace' },
  })
  const [{ apiKey: privateKey }, { apiKey: publicKey }] = await Promise.all(
    ['PRIVATE', 'PUBLIC'].map((type) =>
      postServerApi({
        path: '/api-keys',
        apiKey: organizationApiKey,
        body: { type, workspaceId: workspace.id, name: `E2E ${type}` },
      }),
    ),
  )
  const { provider } = await postServerApi({
    path: '/providers',
    apiKey: privateKey.value,
    body: {
      type: 'OPENAI',
      name: 'Fake OpenAI',
      apiKey: `${FAKE_OPENAI_API_KEY_PREFIX}${openaiBaseUrl}`,
    },
  })
  const { assistant } = await postServerApi({
    path: '/assistants',
    apiKey: privateKey.value,
    body: {
      storageProviderType: 'OPENAI',
      storageProviderAssistantId: 'asst_fake',
      modelProviderId: provider.id,
      model: 'gpt-fake',
      name: 'E2E Assistant',
    },
  })

  return {
    workspace,
    privateKey: privateKey.value as string,
    publicKey: publicKey.value as string,
    assistant,
  }
}
