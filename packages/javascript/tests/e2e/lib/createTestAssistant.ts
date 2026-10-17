import { testServer } from './testServer'

type Json = Record<string, unknown>

const request = async ({
  path,
  apiKey,
  body,
}: {
  path: string
  apiKey: string
  body: Json
}) => {
  const response = await fetch(`${testServer().apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await response.json()

  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${JSON.stringify(json)}`)
  }

  return json
}

export type TestAssistant = Awaited<ReturnType<typeof createTestAssistant>>

// Sets up a workspace, keys, an Ollama model provider pointed at `llmBaseUrl`
// and a Superinterface Cloud assistant, all through the server's public API.
export const createTestAssistant = async ({
  llmBaseUrl,
}: {
  llmBaseUrl: string
}) => {
  const { organizationApiKey } = testServer()

  const { workspace } = await request({
    path: '/workspaces',
    apiKey: organizationApiKey,
    body: { name: 'E2E Workspace' },
  })
  const [{ apiKey: privateKey }, { apiKey: publicKey }] = await Promise.all(
    ['PRIVATE', 'PUBLIC'].map((type) =>
      request({
        path: '/api-keys',
        apiKey: organizationApiKey,
        body: { type, workspaceId: workspace.id, name: `E2E ${type}` },
      }),
    ),
  )
  const { provider: modelProvider } = await request({
    path: '/providers',
    apiKey: privateKey.value,
    body: { type: 'OLLAMA', name: 'Fake LLM', endpoint: llmBaseUrl },
  })
  const { assistant } = await request({
    path: '/assistants',
    apiKey: privateKey.value,
    body: {
      storageProviderType: 'SUPERINTERFACE_CLOUD',
      modelProviderId: modelProvider.id,
      model: 'fake-model',
      name: 'E2E Assistant',
    },
  })

  return {
    assistantId: assistant.id as string,
    publicApiKey: publicKey.value as string,
  }
}
