import { ModelProvider, ModelProviderType } from '@prisma/client'

export const isModelProviderValid = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  if (modelProvider.type === ModelProviderType.OLLAMA) {
    return !!modelProvider.endpoint
  }

  if (!modelProvider.apiKey) {
    return false
  }

  if (modelProvider.type === ModelProviderType.AZURE_OPENAI) {
    if (!modelProvider.endpoint) {
      return false
    }
  }

  return true
}
