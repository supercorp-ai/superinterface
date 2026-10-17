import {
  ApiKeyType,
  ModelProviderType,
  Prisma,
  StorageProviderType,
} from '@prisma/client'
import { createTestWorkspace } from '../workspaces/createTestWorkspace'
import { createTestModelProvider } from '../modelProviders/createTestModelProvider'
import { createTestAssistant } from './createTestAssistant'
import { createTestApiKey } from '../apiKeys/createTestApiKey'

// Creates a workspace, an OLLAMA model provider pointed at a fake LLM, a
// SUPERINTERFACE_CLOUD assistant and a public API key for /api/messages.
export const createFakeLlmAssistant = async ({
  baseURL,
  workspaceId,
  data = {},
}: {
  baseURL: string
  workspaceId?: string
  data?: Partial<Prisma.AssistantUncheckedCreateInput>
}) => {
  const workspace = workspaceId
    ? { id: workspaceId }
    : await createTestWorkspace()
  const modelProvider = await createTestModelProvider({
    data: {
      workspaceId: workspace.id,
      type: ModelProviderType.OLLAMA,
      endpoint: baseURL,
    },
  })
  const assistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: modelProvider.id,
      storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      modelSlug: 'fake-model',
      instructions: 'Be brief.',
      ...data,
    },
  })
  const publicKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
  })

  return { workspace, modelProvider, assistant, publicKey }
}
