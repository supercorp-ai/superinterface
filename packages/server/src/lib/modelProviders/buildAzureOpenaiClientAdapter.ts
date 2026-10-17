import { ModelProvider } from '@prisma/client'
import { AzureOpenAI } from 'openai'
import { azureOpenaiClientAdapter } from 'supercompat/openai'

export const buildAzureOpenaiClientAdapter = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  const azureOpenai = new AzureOpenAI({
    apiKey: modelProvider.apiKey,
    endpoint: modelProvider.endpoint!,
    apiVersion: modelProvider.apiVersion || '2025-04-01-preview',
    defaultHeaders: {
      'HTTP-Referer': 'https://superinterface.ai',
      'X-Title': 'Superinterface',
    },
    // @ts-expect-error duplex is not yet in the types
    fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> =>
      fetch(url, {
        ...init,
        // @ts-expect-error  duplex is not yet in the types
        duplex: 'half',
      }),
  })

  return azureOpenaiClientAdapter({
    azureOpenai,
  })
}
