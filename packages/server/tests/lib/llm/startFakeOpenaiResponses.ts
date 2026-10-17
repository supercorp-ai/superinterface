import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'

// Output items of a fake response, e.g. a `computer_call`, a `function_call`
// or `{ type: 'message', text }` for an assistant message.
export type FakeResponseOutputItem =
  | { type: 'message'; text: string }
  | ({ type: 'computer_call' | 'function_call' } & Record<string, unknown>)

export type FakeOpenaiRequest = {
  method: string
  path: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : null
}

const serializeItem = ({ item }: { item: FakeResponseOutputItem }) => {
  if (item.type !== 'message') {
    return { id: `item_${randomUUID()}`, status: 'completed', ...item }
  }

  return {
    id: `msg_${randomUUID()}`,
    type: 'message',
    role: 'assistant',
    status: 'completed',
    content: [{ type: 'output_text', text: item.text, annotations: [] }],
  }
}

// A local stand-in for the OpenAI Responses + Conversations APIs. Point the
// OpenAI SDK at it with OPENAI_BASE_URL=`baseURL`. Each POST /responses
// streams the next entry of `replies` as a completed response.
export const startFakeOpenaiResponses = async ({
  replies,
}: {
  replies: FakeResponseOutputItem[][]
}) => {
  const requests: FakeOpenaiRequest[] = []
  const responses = new Map<string, unknown>()
  let responseIndex = 0

  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const body = await readBody(req)
    requests.push({ method: req.method ?? 'GET', path, body })

    const sendJson = (status: number, data: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(data))
    }

    if (req.method === 'POST' && path === '/v1/responses') {
      const output = (
        replies[responseIndex++] ?? [{ type: 'message', text: 'Done.' }]
      ).map((item) => serializeItem({ item }))
      const base = {
        id: `resp_${randomUUID().replace(/-/g, '')}`,
        object: 'response',
        created_at: Math.floor(Date.now() / 1000),
        model: body?.model ?? 'gpt-fake',
        conversation: { id: body?.conversation ?? 'conv_fake' },
        metadata: body?.metadata ?? {},
        error: null,
        usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
      }
      const completed = { ...base, status: 'completed', output }
      responses.set(base.id, completed)
      const events = [
        {
          type: 'response.created',
          response: { ...base, status: 'in_progress', output: [] },
        },
        ...output.flatMap((item, outputIndex) => [
          {
            type: 'response.output_item.added',
            output_index: outputIndex,
            item,
          },
          {
            type: 'response.output_item.done',
            output_index: outputIndex,
            item,
          },
        ]),
        { type: 'response.completed', response: completed },
      ]

      res.writeHead(200, { 'content-type': 'text/event-stream' })
      for (const [index, event] of events.entries()) {
        const data = { ...event, sequence_number: index }
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(data)}\n\n`)
      }
      res.end()
      return
    }

    const responseMatch = path.match(/^\/v1\/responses\/([^/]+)(\/.*)?$/)
    if (req.method === 'GET' && responseMatch) {
      const response = responses.get(responseMatch[1])
      if (responseMatch[2]) {
        sendJson(200, { object: 'list', data: [], has_more: false })
        return
      }
      sendJson(response ? 200 : 404, response ?? { error: { message: 'gone' } })
      return
    }

    const conversation = {
      id: 'conv_fake',
      object: 'conversation',
      created_at: 0,
      metadata: {},
    }

    if (req.method === 'POST' && path === '/v1/conversations') {
      sendJson(200, conversation)
      return
    }

    if (path.startsWith('/v1/conversations/') && path.endsWith('/items')) {
      sendJson(200, { object: 'list', data: [], has_more: false })
      return
    }

    if (path.startsWith('/v1/conversations/')) {
      sendJson(200, conversation)
      return
    }

    sendJson(404, { error: { message: `Unhandled ${req.method} ${path}` } })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    requests,
    responseRequests: () =>
      requests.filter(
        ({ method, path }) => method === 'POST' && path === '/v1/responses',
      ),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
