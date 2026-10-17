import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'

export type FakeOpenaiRequest = {
  method: string
  path: string
  rawPath: string
  query: URLSearchParams
  headers: IncomingHttpHeaders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

export type FakeOpenaiEvent = {
  event?: string
  data: unknown
}

export type FakeOpenaiReply =
  | {
      type: 'json'
      json: unknown
      status?: number
      headers?: Record<string, string>
    }
  | {
      type: 'raw'
      body: string | Buffer
      status?: number
      headers?: Record<string, string>
    }
  | {
      type: 'sse'
      events: FakeOpenaiEvent[]
      waitFor?: Promise<unknown>
      finish?: 'end' | 'destroy'
    }
  | { type: 'destroy' }

export type FakeOpenaiHandler = (args: {
  request: FakeOpenaiRequest
}) => FakeOpenaiReply | undefined | Promise<FakeOpenaiReply | undefined>

const now = () => Math.floor(Date.now() / 1000)

const readBody = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  if (!(req.headers['content-type'] ?? '').includes('json')) return raw
  return JSON.parse(raw)
}

// Azure clients prefix paths with /openai (and sometimes /v1 or a deployment).
const normalizePath = ({ rawPath }: { rawPath: string }) =>
  rawPath
    .replace(/^\/openai/, '')
    .replace(/^\/v1/, '')
    .replace(/^\/deployments\/[^/]+/, '')

const list = ({ data = [] }: { data?: unknown[] } = {}) => ({
  object: 'list',
  data,
  first_id: null,
  last_id: null,
  has_more: false,
})

export const fakeRun = ({
  threadId,
  runId = `run_${randomUUID()}`,
  status = 'in_progress',
}: {
  threadId: string
  runId?: string
  status?: string
}) => ({
  id: runId,
  object: 'thread.run',
  created_at: now(),
  thread_id: threadId,
  assistant_id: 'asst_fake',
  status,
  required_action: null,
  last_error: null,
  model: 'gpt-fake',
  instructions: '',
  tools: [],
  metadata: {},
})

export const fakeMessage = ({
  threadId,
  text,
  role = 'assistant',
  runId = null,
  status = 'completed',
}: {
  threadId: string
  text: string
  role?: string
  runId?: string | null
  status?: string
}) => ({
  id: `msg_${randomUUID()}`,
  object: 'thread.message',
  created_at: now(),
  thread_id: threadId,
  role,
  content: [{ type: 'text', text: { value: text, annotations: [] } }],
  run_id: runId,
  assistant_id: role === 'assistant' ? 'asst_fake' : null,
  attachments: [],
  metadata: {},
  status,
})

// The event sequence of a successful Assistants API run.
export const completedRunEvents = ({
  threadId,
  text = 'Hello from the fake Assistants API.',
}: {
  threadId: string
  text?: string
}): FakeOpenaiEvent[] => {
  const run = fakeRun({ threadId })
  const message = fakeMessage({ threadId, text, runId: run.id })

  return [
    { event: 'thread.run.created', data: { ...run, status: 'queued' } },
    { event: 'thread.run.in_progress', data: run },
    {
      event: 'thread.message.created',
      data: { ...message, status: 'in_progress' },
    },
    { event: 'thread.message.completed', data: message },
    { event: 'thread.run.completed', data: { ...run, status: 'completed' } },
  ]
}

const defaultReply = ({
  request,
}: {
  request: FakeOpenaiRequest
}): FakeOpenaiReply => {
  const { method, path, body } = request
  const segments = path.split('/').filter(Boolean)
  const json = (value: unknown): FakeOpenaiReply => ({
    type: 'json',
    json: value,
  })

  if (method === 'POST' && path === '/threads') {
    return json({
      id: `thread_${randomUUID()}`,
      object: 'thread',
      created_at: now(),
      metadata: body?.metadata ?? {},
      tool_resources: null,
    })
  }

  if (segments[0] === 'threads' && segments[2] === 'messages') {
    if (method === 'POST') {
      return json({
        ...fakeMessage({
          threadId: segments[1],
          text: String(body?.content ?? ''),
          role: body?.role ?? 'user',
        }),
        metadata: body?.metadata ?? {},
        attachments: body?.attachments ?? [],
      })
    }

    return json(list())
  }

  if (segments[0] === 'threads' && segments[2] === 'runs') {
    if (method === 'POST' && segments.length === 3) {
      return {
        type: 'sse',
        events: completedRunEvents({ threadId: segments[1] }),
      }
    }

    if (method === 'POST' && segments[4] === 'cancel') {
      return json(
        fakeRun({
          threadId: segments[1],
          runId: segments[3],
          status: 'cancelling',
        }),
      )
    }

    return json(list())
  }

  if (method === 'POST' && path === '/files') {
    return json({
      id: `file-${randomUUID()}`,
      object: 'file',
      bytes: 0,
      created_at: now(),
      filename: 'upload',
      purpose: 'assistants',
      status: 'processed',
    })
  }

  if (method === 'GET' && segments[0] === 'files' && segments.length === 2) {
    return json({
      id: segments[1],
      object: 'file',
      bytes: 12,
      created_at: now(),
      filename: 'file.txt',
      purpose: 'user_data',
      status: 'processed',
    })
  }

  if (
    method === 'GET' &&
    segments[0] === 'files' &&
    segments[2] === 'content'
  ) {
    return {
      type: 'raw',
      body: 'file-content',
      headers: { 'content-type': 'text/plain' },
    }
  }

  if (method === 'GET' && segments[0] === 'containers') {
    return {
      type: 'raw',
      body: 'container-file-content',
      headers: { 'content-type': 'text/plain' },
    }
  }

  if (method === 'POST' && path === '/audio/transcriptions') {
    return json({ text: 'Transcribed audio.' })
  }

  if (method === 'POST' && path === '/conversations') {
    return json({
      id: `conv_${randomUUID().replace(/-/g, '')}`,
      object: 'conversation',
      created_at: now(),
      metadata: body?.metadata ?? {},
    })
  }

  if (segments[0] === 'conversations' && segments[2] === 'items') {
    return json(list())
  }

  if (method === 'GET' && segments[0] === 'conversations') {
    return json({
      id: segments[1],
      object: 'conversation',
      created_at: now(),
      metadata: {},
    })
  }

  return {
    type: 'json',
    status: 404,
    json: { error: { message: `Unhandled ${method} ${path}` } },
  }
}

const writeSse = async ({
  res,
  reply,
}: {
  res: ServerResponse
  reply: Extract<FakeOpenaiReply, { type: 'sse' }>
}) => {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  })

  for (const { event, data } of reply.events) {
    const eventLine = event ? `event: ${event}\n` : ''
    res.write(`${eventLine}data: ${JSON.stringify(data)}\n\n`)
  }

  if (reply.waitFor) await reply.waitFor

  if (reply.finish === 'destroy') {
    res.destroy()
    return
  }

  res.end('event: done\ndata: [DONE]\n\n')
}

// A local stand-in for the OpenAI REST API (Assistants, Files, Audio,
// Conversations). The OpenAI SDK reads `OPENAI_BASE_URL`, so setting it to
// `baseURL` routes every storage provider that talks to OpenAI here. Azure
// OpenAI model providers can point their `endpoint` at `origin`.
export const startFakeOpenai = async ({
  handle,
}: {
  handle?: FakeOpenaiHandler
} = {}) => {
  const requests: FakeOpenaiRequest[] = []

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const request: FakeOpenaiRequest = {
      method: req.method ?? 'GET',
      rawPath: url.pathname,
      path: normalizePath({ rawPath: url.pathname }),
      query: url.searchParams,
      headers: req.headers,
      body: await readBody({ req }),
    }
    requests.push(request)

    const reply = (await handle?.({ request })) ?? defaultReply({ request })

    if (reply.type === 'destroy') {
      res.destroy()
      return
    }

    if (reply.type === 'sse') {
      await writeSse({ res, reply })
      return
    }

    if (reply.type === 'raw') {
      res.writeHead(reply.status ?? 200, reply.headers ?? {})
      res.end(reply.body)
      return
    }

    res.writeHead(reply.status ?? 200, {
      'content-type': 'application/json',
      'x-should-retry': 'false',
      ...(reply.headers ?? {}),
    })
    res.end(JSON.stringify(reply.json))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    origin: `http://127.0.0.1:${port}`,
    baseURL: `http://127.0.0.1:${port}/v1`,
    requests,
    find: ({ method, path }: { method: string; path: string | RegExp }) =>
      requests.filter(
        (request) =>
          request.method === method &&
          (typeof path === 'string'
            ? request.path === path
            : path.test(request.path)),
      ),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
