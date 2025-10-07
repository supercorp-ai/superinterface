import { ModelProvider } from '@prisma/client'
import { buildOpenaiClient } from '@/lib/modelProviders/buildOpenaiClient'
import { isModelProviderValid } from '@/lib/modelProviders/isModelProviderValid'

export const getOpenaiAssistants = async ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  if (!isModelProviderValid({ modelProvider })) {
    return []
  }

  const client = buildOpenaiClient({
    modelProvider,
  })

  const assistants = []

  try {
    for await (const assistant of client.beta.assistants.list({ limit: 100 })) {
      assistants.push(assistant)
    }
  } catch (e) {
    console.error(e)
    return assistants
  }

  return assistants
}
