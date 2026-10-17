import {
  ApiKeyType,
  ModelProviderType,
  Prisma,
  StorageProviderType,
} from '@prisma/client'
import { createTestWorkspace } from '../workspaces/createTestWorkspace'
import { createTestModelProvider } from '../modelProviders/createTestModelProvider'
import { createTestAssistant } from '../assistants/createTestAssistant'
import { createTestThread } from '../threads/createTestThread'
import { createTestApiKey } from '../apiKeys/createTestApiKey'

// Workspace + assistant + thread + API keys for exercising the task routes.
// The assistant talks to `endpoint` (e.g. a fake LLM) through an OLLAMA
// provider unless a different provider type is requested.
export const createTaskTestContext = async ({
  endpoint = 'http://127.0.0.1:9/v1',
  modelProviderType = ModelProviderType.OLLAMA,
  storageProviderType = StorageProviderType.SUPERINTERFACE_CLOUD,
  assistantData = {},
  threadData = {},
}: {
  endpoint?: string
  modelProviderType?: ModelProviderType
  storageProviderType?: StorageProviderType
  assistantData?: Partial<Prisma.AssistantUncheckedCreateInput>
  threadData?: Partial<Prisma.ThreadUncheckedCreateInput>
} = {}) => {
  const workspace = await createTestWorkspace()
  const modelProvider = await createTestModelProvider({
    data: {
      workspaceId: workspace.id,
      type: modelProviderType,
      endpoint,
    },
  })
  const assistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: modelProvider.id,
      storageProviderType,
      modelSlug: 'fake-model',
      instructions: 'Be brief.',
      ...assistantData,
    },
  })
  const thread = await createTestThread({
    data: { assistantId: assistant.id, ...threadData },
  })
  const privateApiKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
  })
  const publicApiKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
  })

  return {
    workspace,
    modelProvider,
    assistant,
    thread,
    privateApiKey,
    publicApiKey,
    authorization: `Bearer ${privateApiKey.value}`,
  }
}
