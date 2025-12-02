import { ModelProviderType, type ModelProvider } from '@prisma/client'

export const serializeModelProvider = ({
  provider,
}: {
  provider: ModelProvider
}) => {
  const base = {
    id: provider.id,
    type: provider.type,
    name: provider.name,
    apiKey: provider.apiKey,
    endpoint: provider.endpoint,
    apiVersion: provider.apiVersion,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  }

  if (provider.type === ModelProviderType.AZURE_AI_PROJECT) {
    return {
      ...base,
      azureTenantId: provider.azureTenantId,
      azureClientId: provider.azureClientId,
      azureClientSecret: provider.azureClientSecret,
    }
  }

  return base
}

export type SerializedModelProvider = ReturnType<typeof serializeModelProvider>
