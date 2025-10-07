import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { Mistral } from '@mistralai/mistralai'
import Anthropic from '@anthropic-ai/sdk'
import {
  mistralClientAdapter,
  groqClientAdapter,
  perplexityClientAdapter,
  humirisClientAdapter,
  googleClientAdapter,
  togetherClientAdapter,
  anthropicClientAdapter,
} from 'supercompat'
import { ModelProvider, ModelProviderType } from '@prisma/client'
import { buildOpenaiClientAdapter } from '@/lib/modelProviders/buildOpenaiClientAdapter'
import { buildAzureOpenaiClientAdapter } from '@/lib/modelProviders/buildAzureOpenaiClientAdapter'

export const clientAdapter = ({
  modelProvider,
}: {
  modelProvider: ModelProvider
}) => {
  if (modelProvider.type === ModelProviderType.OPENAI) {
    return buildOpenaiClientAdapter({
      modelProvider,
    })
  }

  if (modelProvider.type === ModelProviderType.AZURE_OPENAI) {
    return buildAzureOpenaiClientAdapter({
      modelProvider,
    })
  }

  if (modelProvider.type === ModelProviderType.PERPLEXITY) {
    return perplexityClientAdapter({
      // @ts-ignore-next-line
      perplexity: new OpenAI({
        apiKey: modelProvider.apiKey,
        baseURL: 'https://api.perplexity.ai/',
        // @ts-ignore-next-line
        fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> =>
          fetch(url, {
            ...(init || {}),
            // @ts-ignore-next-line
            duplex: 'half',
          }),
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.TOGETHER) {
    return togetherClientAdapter({
      // @ts-ignore-next-line
      together: new OpenAI({
        apiKey: modelProvider.apiKey,
        baseURL: 'https://api.together.xyz/v1',
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.OPEN_ROUTER) {
    return buildOpenaiClientAdapter({
      modelProvider,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  }

  if (modelProvider.type === ModelProviderType.MISTRAL) {
    return mistralClientAdapter({
      mistral: new Mistral({
        apiKey: modelProvider.apiKey,
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.ANTHROPIC) {
    return anthropicClientAdapter({
      anthropic: new Anthropic({
        apiKey: modelProvider.apiKey,
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.GROQ) {
    return groqClientAdapter({
      groq: new Groq({
        apiKey: modelProvider.apiKey || process.env.COMMUNITY_TEST_GROQ_API_KEY,
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.OLLAMA) {
    return buildOpenaiClientAdapter({
      modelProvider,
      baseURL: modelProvider.endpoint ?? '',
      apiKey: 'ollama',
    })
  }

  if (modelProvider.type === ModelProviderType.HUMIRIS) {
    return humirisClientAdapter({
      // @ts-ignore-next-line
      humiris: new OpenAI({
        apiKey: modelProvider.apiKey,
        baseURL: 'https://moai-service-app.humiris.ai/api/openai/v1/',
        defaultHeaders: {
          'moai-api-key': modelProvider.apiKey,
        },
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.GOOGLE) {
    return googleClientAdapter({
      // @ts-ignore-next-line
      google: new OpenAI({
        apiKey: modelProvider.apiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
    })
  }

  throw new Error(`Invalid model provider type: ${modelProvider.type}`)
}
