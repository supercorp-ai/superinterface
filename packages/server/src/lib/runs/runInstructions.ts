import type { Assistant } from '@prisma/client'
import { usesAzureResponsesAgent } from './usesAzureResponsesAgent'
import { hasStoredInstructions } from './hasStoredInstructions'

// The run's instructions field. It is omitted whenever the storage provider
// should fall back to the instructions it stores.
export const runInstructions = ({ assistant }: { assistant: Assistant }) => {
  if (usesAzureResponsesAgent({ assistant })) return {}

  if (assistant.instructions.length > 0) {
    return { instructions: assistant.instructions }
  }

  if (
    hasStoredInstructions({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return {}
  }

  // Providers without stored instructions (like Superinterface Cloud or
  // OpenAI Responses) get an empty string.
  return { instructions: '' }
}
