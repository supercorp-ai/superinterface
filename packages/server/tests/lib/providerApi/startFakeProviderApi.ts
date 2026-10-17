import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'

export type FakeProviderApiRequest = {
  method: string
  path: string
  search: string
  headers: IncomingHttpHeaders
}

export type FakeProviderAssistant = {
  id: string
  model: string
  name?: string | null
  description?: string | null
  instructions?: string | null
  tools?: unknown[]
}

const openaiModel = ({ id }: { id: string }) => ({
  id,
  object: 'model',
  type: 'model',
  created: 0,
  owned_by: 'fake',
  display_name: id,
  created_at: '2024-01-01T00:00:00Z',
})

const mistralModel = ({ id }: { id: string }) => ({
  id,
  object: 'model',
  created: 0,
  owned_by: 'fake',
  capabilities: {},
  type: 'base',
})

const openRouterModel = ({ id }: { id: string }) => ({
  id,
  canonical_slug: id,
  name: id,
  created: 0,
  pricing: { prompt: '0', completion: '0' },
  context_length: null,
  architecture: {
    modality: null,
    input_modalities: ['text'],
    output_modalities: ['text'],
  },
  top_provider: { is_moderated: false },
  per_request_limits: null,
  supported_parameters: [],
  default_parameters: null,
})

// Each SDK expects its own `GET /models` dialect. Requests redirected by
// `redirectExternalFetch` arrive as `/<original host>/<original path>`, so the
// first path segment tells which provider is being impersonated.
const modelsBody = ({ path, models }: { path: string; models: string[] }) => {
  if (path.startsWith('/api.mistral.ai/')) {
    return { object: 'list', data: models.map((id) => mistralModel({ id })) }
  }

  if (path.startsWith('/openrouter.ai/')) {
    return { data: models.map((id) => openRouterModel({ id })) }
  }

  if (path.startsWith('/api.together.xyz/')) {
    return models.map((id) => openaiModel({ id }))
  }

  if (path.startsWith('/generativelanguage.googleapis.com/')) {
    return { models: models.map((id) => ({ name: `models/${id}` })) }
  }

  const data = models.map((id) => openaiModel({ id }))

  return {
    object: 'list',
    data,
    has_more: false,
    first_id: data[0]?.id ?? null,
    last_id: data[data.length - 1]?.id ?? null,
  }
}

const assistantsBody = ({
  assistants,
}: {
  assistants: FakeProviderAssistant[]
}) => {
  const data = assistants.map((assistant) => ({
    object: 'assistant',
    created_at: 0,
    name: null,
    description: null,
    instructions: null,
    tools: [],
    metadata: {},
    ...assistant,
  }))

  return {
    object: 'list',
    data,
    has_more: false,
    first_id: data[0]?.id ?? null,
    last_id: data[data.length - 1]?.id ?? null,
  }
}

// A local stand-in for the model listing and assistants listing endpoints of
// the hosted providers (OpenAI, Azure OpenAI, Anthropic, Groq, Mistral, ...).
// `status` makes every request fail with that HTTP status instead.
export const startFakeProviderApi = async ({
  models = ['fake-model'],
  assistants = [],
  status,
}: {
  models?: string[]
  assistants?: FakeProviderAssistant[]
  status?: number
} = {}) => {
  const requests: FakeProviderApiRequest[] = []

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const request = {
      method: req.method ?? 'GET',
      path: url.pathname,
      search: url.search,
      headers: req.headers,
    }
    requests.push(request)

    const send = (code: number, body: unknown) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    if (status) {
      send(status, { error: { message: `Fake failure ${status}` } })
      return
    }

    if (request.method === 'GET' && request.path.endsWith('/models')) {
      send(200, modelsBody({ path: request.path, models }))
      return
    }

    if (request.method === 'GET' && request.path.endsWith('/assistants')) {
      send(200, assistantsBody({ assistants }))
      return
    }

    send(404, { error: { message: `Unhandled ${request.path}` } })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    origin: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
