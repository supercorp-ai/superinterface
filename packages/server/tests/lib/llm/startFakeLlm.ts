import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'

export type FakeLlmToolCall = {
  name: string
  arguments?: Record<string, unknown> | string
}

export type FakeLlmReply =
  | { content: string }
  | { toolCalls: FakeLlmToolCall[] }
  | { status: number; error: string }

export type FakeLlmRequest = {
  path: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

type Responder = (args: {
  request: FakeLlmRequest
  index: number
}) => FakeLlmReply

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  return JSON.parse(raw)
}

const serializeArguments = ({
  args,
}: {
  args: FakeLlmToolCall['arguments']
}) => {
  if (typeof args === 'string') return args
  return JSON.stringify(args ?? {})
}

const toolCallsDelta = ({ toolCalls }: { toolCalls: FakeLlmToolCall[] }) =>
  toolCalls.map((toolCall, index) => ({
    index,
    id: `call_${randomUUID().replace(/-/g, '')}`,
    type: 'function',
    function: {
      name: toolCall.name,
      arguments: serializeArguments({ args: toolCall.arguments }),
    },
  }))

const streamChunks = ({
  reply,
  model,
}: {
  reply: Exclude<FakeLlmReply, { status: number }>
  model: string
}) => {
  const id = `chatcmpl-${randomUUID()}`
  const created = Math.floor(Date.now() / 1000)
  const chunk = (delta: object, finishReason: string | null) => ({
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })

  if ('toolCalls' in reply) {
    return [
      chunk(
        {
          role: 'assistant',
          content: null,
          tool_calls: toolCallsDelta({ toolCalls: reply.toolCalls }),
        },
        null,
      ),
      chunk({}, 'tool_calls'),
    ]
  }

  return [
    chunk({ role: 'assistant', content: reply.content }, null),
    chunk({}, 'stop'),
  ]
}

const completion = ({
  reply,
  model,
}: {
  reply: Exclude<FakeLlmReply, { status: number }>
  model: string
}) => ({
  id: `chatcmpl-${randomUUID()}`,
  object: 'chat.completion',
  created: Math.floor(Date.now() / 1000),
  model,
  choices: [
    {
      index: 0,
      finish_reason: 'toolCalls' in reply ? 'tool_calls' : 'stop',
      message:
        'toolCalls' in reply
          ? {
              role: 'assistant',
              content: null,
              tool_calls: toolCallsDelta({ toolCalls: reply.toolCalls }).map(
                ({ id, type, function: fn }) => ({ id, type, function: fn }),
              ),
            }
          : { role: 'assistant', content: reply.content },
    },
  ],
})

// A local OpenAI-compatible server. Point an OLLAMA model provider's
// `endpoint` at `baseURL` to drive runs deterministically end to end.
export const startFakeLlm = async ({
  replies = [],
  respond,
  models = ['fake-model'],
}: {
  replies?: FakeLlmReply[]
  respond?: Responder
  models?: string[]
} = {}) => {
  const requests: FakeLlmRequest[] = []
  let completionIndex = 0

  const nextReply = ({ request }: { request: FakeLlmRequest }) => {
    const index = completionIndex++
    if (respond) return respond({ request, index })
    return replies[index] ?? { content: 'Done.' }
  }

  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const body = await readBody(req)
    const request = { path, body }
    requests.push(request)

    if (req.method === 'GET' && path.endsWith('/models')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          object: 'list',
          data: models.map((id) => ({
            id,
            object: 'model',
            created: 0,
            owned_by: 'fake',
          })),
        }),
      )
      return
    }

    if (req.method !== 'POST' || !path.endsWith('/chat/completions')) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: `Unhandled ${path}` } }))
      return
    }

    const reply = nextReply({ request })
    const model = body?.model ?? 'fake-model'

    if ('status' in reply) {
      res.writeHead(reply.status, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: reply.error } }))
      return
    }

    if (!body?.stream) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(completion({ reply, model })))
      return
    }

    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    for (const chunk of streamChunks({ reply, model })) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    }
    res.end('data: [DONE]\n\n')
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    requests,
    completionRequests: () =>
      requests.filter(({ path }) => path.endsWith('/chat/completions')),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
