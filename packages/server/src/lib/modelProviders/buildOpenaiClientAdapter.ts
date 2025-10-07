import { ModelProvider } from '@prisma/client'
import OpenAI from 'openai'
import { openaiClientAdapter } from 'supercompat'

export const buildOpenaiClientAdapter = ({
  modelProvider,
  baseURL,
  apiKey,
}: {
  modelProvider: ModelProvider
  baseURL?: string
  apiKey?: string
}) =>
  openaiClientAdapter({
    openai: new OpenAI({
      apiKey: apiKey ?? modelProvider.apiKey,
      ...(baseURL ? { baseURL } : {}),
      defaultHeaders: {
        'HTTP-Referer': 'https://superinterface.ai',
        'X-Title': 'Superinterface',
      },
      // @ts-expect-error duplex is not yet in the types
      fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> =>
        fetch(url, {
          ...(init || {}),
          // @ts-expect-error duplex is not yet in the types
          duplex: 'half',
        }),
    }),
  })
