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

// A workspace with a model provider, an assistant and both API key types.
export const createTestAssistantSetup = async ({
  modelProviderType = ModelProviderType.OPENAI,
  storageProviderType = StorageProviderType.OPENAI_RESPONSES,
  assistantData = {},
}: {
  modelProviderType?: ModelProviderType
  storageProviderType?: StorageProviderType
  assistantData?: Partial<Prisma.AssistantUncheckedCreateInput>
} = {}) => {
  const workspace = await createTestWorkspace()
  const modelProvider = await createTestModelProvider({
    data: { workspaceId: workspace.id, type: modelProviderType },
  })
  const assistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: modelProvider.id,
      storageProviderType,
      modelSlug: 'gpt-4o-mini',
      ...assistantData,
    },
  })
  const privateKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
  })
  const publicKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
  })

  return {
    workspace,
    modelProvider,
    assistant,
    privateKey,
    publicKey,
    authHeaders: { Authorization: `Bearer ${privateKey.value}` },
  }
}
