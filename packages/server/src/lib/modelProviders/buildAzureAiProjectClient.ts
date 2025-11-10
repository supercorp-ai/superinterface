import { AIProjectClient } from '@azure/ai-projects'
import { ClientSecretCredential } from '@azure/identity'
import { ModelProvider } from '@prisma/client'

export const buildAzureAiProjectClient = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  const { azureTenantId, azureClientId, azureClientSecret, endpoint } =
    modelProvider

  if (!azureTenantId || !azureClientId || !azureClientSecret || !endpoint) {
    throw new Error(
      'Azure AI Project credentials missing. Please configure azureTenantId, azureClientId, azureClientSecret, and endpoint in ModelProvider.',
    )
  }

  const credential = new ClientSecretCredential(
    azureTenantId,
    azureClientId,
    azureClientSecret,
  )

  const azureAiProject = new AIProjectClient(endpoint, credential)

  return azureAiProject
}
