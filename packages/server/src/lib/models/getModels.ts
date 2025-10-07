import { buildOpenaiClient } from '@/lib/modelProviders/buildOpenaiClient'
import type { ModelProvider } from '@prisma/client'

export const getModels = async ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  const client = buildOpenaiClient({
    modelProvider,
  })

  const models = []

  try {
    const list = await client.models.list()

    for await (const model of list) {
      models.push(model)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw new Error(`Failed to load models from AI provider.`)
  }

  return models
}
