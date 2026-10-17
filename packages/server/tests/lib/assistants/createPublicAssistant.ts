import { ApiKeyType, Prisma } from '@prisma/client'
import { createTestWorkspace } from '../workspaces/createTestWorkspace'
import { createTestModelProvider } from '../modelProviders/createTestModelProvider'
import { createTestAssistant } from './createTestAssistant'
import { createTestApiKey } from '../apiKeys/createTestApiKey'

// A workspace with one model provider, one assistant and a public api key.
export const createPublicAssistant = async ({
  modelProvider = {},
  assistant = {},
}: {
  modelProvider?: Partial<Prisma.ModelProviderUncheckedCreateInput>
  assistant?: Partial<Prisma.AssistantUncheckedCreateInput>
} = {}) => {
  const workspace = await createTestWorkspace()
  const createdModelProvider = await createTestModelProvider({
    data: { workspaceId: workspace.id, ...modelProvider },
  })
  const createdAssistant = await createTestAssistant({
    data: {
      workspaceId: workspace.id,
      modelProviderId: createdModelProvider.id,
      ...assistant,
    },
  })
  const publicKey = await createTestApiKey({
    data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
  })

  return {
    workspace,
    modelProvider: createdModelProvider,
    assistant: createdAssistant,
    publicApiKey: publicKey.value,
  }
}
