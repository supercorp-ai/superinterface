import { ModelProvider } from '@prisma/client'
import OpenAI from 'openai'
import { openaiClientAdapter } from 'supercompat/openai'

export const buildOpenaiClientAdapter = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) =>
  openaiClientAdapter({
    openai: new OpenAI({
      apiKey: modelProvider.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://superinterface.ai',
        'X-Title': 'Superinterface',
      },
      // @ts-expect-error duplex is not yet in the types
      fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> =>
        fetch(url, {
          ...init,
          // @ts-expect-error duplex is not yet in the types
          duplex: 'half',
        }),
    }),
  })
