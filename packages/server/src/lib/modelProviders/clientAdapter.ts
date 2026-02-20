import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { Mistral } from '@mistralai/mistralai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { OpenRouter } from '@openrouter/sdk'
import {
  mistralClientAdapter,
  groqClientAdapter,
  perplexityClientAdapter,
  humirisClientAdapter,
  googleClientAdapter,
  togetherClientAdapter,
  anthropicClientAdapter,
  azureAiProjectClientAdapter,
  openRouterClientAdapter,
} from 'supercompat'
import { AIProjectClient as AIProjectClientV1 } from '@azure/ai-projects'
import {
  ModelProvider,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { buildOpenaiClientAdapter } from '@/lib/modelProviders/buildOpenaiClientAdapter'
import { buildAzureOpenaiClientAdapter } from '@/lib/modelProviders/buildAzureOpenaiClientAdapter'
import { getAzureAiProjectClient } from '@/lib/modelProviders/getAzureAiProjectClient'

export const clientAdapter = ({
  modelProvider,
  storageProviderType,
}: {
  modelProvider: ModelProvider
  storageProviderType: StorageProviderType
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

  if (modelProvider.type === ModelProviderType.AZURE_AI_PROJECT) {
    const azureAiProject = getAzureAiProjectClient({
      modelProvider,
      storageProviderType,
    })
    return azureAiProjectClientAdapter({
      azureAiProject: azureAiProject as AIProjectClientV1,
    })
  }

  if (modelProvider.type === ModelProviderType.PERPLEXITY) {
    return perplexityClientAdapter({
      perplexity: new OpenAI({
        apiKey: modelProvider.apiKey,
        baseURL: 'https://api.perplexity.ai/',
        // @ts-expect-error duplex is not yet in the types
        fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> =>
          fetch(url, {
            ...(init || {}),
            // @ts-expect-error duplex is not yet in the types
            duplex: 'half',
          }),
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.TOGETHER) {
    return togetherClientAdapter({
      together: new OpenAI({
        apiKey: modelProvider.apiKey,
        baseURL: 'https://api.together.xyz/v1',
      }),
    })
  }

  if (modelProvider.type === ModelProviderType.OPEN_ROUTER) {
    return openRouterClientAdapter({
      openRouter: new OpenRouter({
        apiKey: modelProvider.apiKey,
        httpReferer: 'https://superinterface.ai',
        xTitle: 'Superinterface',
      }),
      provider: { sort: 'throughput' },
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
      google: new GoogleGenAI({ apiKey: modelProvider.apiKey }),
    })
  }

  throw new Error(`Invalid model provider type: ${modelProvider.type}`)
}
