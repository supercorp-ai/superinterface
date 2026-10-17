import { ModelProviderType, type Prisma } from '@prisma/client'

// The workspace's OpenAI model provider, which must have an API key.
export const openaiModelProvider = ({
  modelProviders,
}: {
  modelProviders: Prisma.WorkspaceGetPayload<{
    include: {
      modelProviders: true
    }
  }>['modelProviders']
}) => {
  const modelProvider = modelProviders.find(
    ({ type }) => type === ModelProviderType.OPENAI,
  )

  if (!modelProvider?.apiKey) {
    throw new Error('No OpenAI API key found')
  }

  return modelProvider
}
