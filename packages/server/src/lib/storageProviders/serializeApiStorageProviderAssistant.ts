import type { OpenAI } from 'openai'

export const serializeApiStorageProviderAssistant = ({
  storageProviderAssistant,
}: {
  storageProviderAssistant: OpenAI.Beta.Assistant
}) => ({
  id: storageProviderAssistant.id,
  model: storageProviderAssistant.model,
  name: storageProviderAssistant.name,
  description: storageProviderAssistant.description,
  instructions: storageProviderAssistant.instructions,
  tools: storageProviderAssistant.tools,
})
