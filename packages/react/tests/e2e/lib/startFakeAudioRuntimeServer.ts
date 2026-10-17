import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

export type FakeAudioRuntimeRequest = {
  method: string
  path: string
  query: URLSearchParams
  body: string
  // For forwarded requests: the test server's response status, once it came,
  // and whether its whole response has been passed on.
  status?: number
  finished?: boolean
}

export type FakeWebrtcAnswer = {
  status?: number
  sdp?: string
}

// Raw chunks written, in order, as the body of a webrtc/events response.
export type FakeWebrtcEventsReply = {
  status?: number
  chunks?: string[]
}

export const FAKE_ANSWER_SDP = [
  'v=0',
  'o=- 1 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  '',
].join('\r\n')

const readBody = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The open-source server has no audio runtime routes (Superinterface Cloud
// serves them), so this stands in for just those:
// - GET  /api/audio-runtimes/tts           speech for `input` (fake mp3 bytes)
// - POST /api/audio-runtimes/webrtc        SDP answer for the browser's offer
// - POST /api/audio-runtimes/webrtc/events newline-delimited JSON events
// Every other request is forwarded to the real test server, so pointing
// SuperinterfaceProvider's `baseUrl` at `apiBaseUrl` keeps the rest real.
export const startFakeAudioRuntimeServer = async ({
  upstreamBaseUrl,
  ttsStatus = 200,
  webrtcAnswer = {},
  webrtcEvents = () => ({}),
}: {
  upstreamBaseUrl: string
  ttsStatus?: number
  webrtcAnswer?: FakeWebrtcAnswer
  webrtcEvents?: (args: {
    event: Record<string, unknown>
  }) => FakeWebrtcEventsReply
}) => {
  const requests: FakeAudioRuntimeRequest[] = []
  const proxiedRequests: FakeAudioRuntimeRequest[] = []

  const reply = ({
    res,
    status,
    headers = {},
    body = '',
  }: {
    res: ServerResponse
    status: number
    headers?: Record<string, string>
    body?: string | Buffer
  }) => {
    res.writeHead(status, { ...corsHeaders, ...headers })
    res.end(body)
  }

  const proxy = async ({
    req,
    res,
    body,
    request,
  }: {
    req: IncomingMessage
    res: ServerResponse
    body: Buffer
    request: FakeAudioRuntimeRequest
  }) => {
    const headers = Object.fromEntries(
      Object.entries(req.headers).filter(
        ([name]) => !['host', 'connection', 'content-length'].includes(name),
      ),
    ) as Record<string, string>

    try {
      const response = await fetch(`${upstreamBaseUrl}${req.url}`, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method ?? 'GET')
          ? undefined
          : new Uint8Array(body),
      })
      request.status = response.status
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, name) => {
        if (['content-encoding', 'content-length'].includes(name)) return
        responseHeaders[name] = value
      })
      res.writeHead(response.status, responseHeaders)

      if (!response.body) {
        res.end()
        return
      }

      Readable.fromWeb(response.body as never).pipe(res)
    } catch {
      res.destroy()
    }
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const body = await readBody({ req })
    const request: FakeAudioRuntimeRequest = {
      method: req.method ?? 'GET',
      path: url.pathname,
      query: url.searchParams,
      body: body.toString('utf8'),
    }

    if (!url.pathname.startsWith('/api/audio-runtimes/')) {
      proxiedRequests.push(request)
      res.on('close', () => {
        request.finished = true
      })
      await proxy({ req, res, body, request })
      return
    }

    if (request.method === 'OPTIONS') {
      reply({ res, status: 204 })
      return
    }

    requests.push(request)

    if (url.pathname === '/api/audio-runtimes/tts') {
      reply({
        res,
        status: ttsStatus,
        headers: { 'content-type': 'audio/mpeg' },
        body: `fake-mp3:${url.searchParams.get('input')}`,
      })
      return
    }

    if (url.pathname === '/api/audio-runtimes/webrtc') {
      reply({
        res,
        status: webrtcAnswer.status ?? 200,
        headers: { 'content-type': 'application/sdp' },
        body: webrtcAnswer.sdp ?? FAKE_ANSWER_SDP,
      })
      return
    }

    if (url.pathname === '/api/audio-runtimes/webrtc/events') {
      const { status = 200, chunks = [] } = webrtcEvents({
        event: JSON.parse(request.body),
      })
      res.writeHead(status, {
        ...corsHeaders,
        'content-type': 'application/x-ndjson',
      })
      for (const chunk of chunks) {
        res.write(chunk)
        await sleep(10)
      }
      res.end()
      return
    }

    reply({ res, status: 404 })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    apiBaseUrl: `http://127.0.0.1:${port}/api`,
    requests,
    proxiedRequests,
    find: ({ path }: { path: string }) =>
      requests.filter((request) => request.path === `/api${path}`),
    // Resolves once every forwarded response (e.g. a message stream) is done.
    idle: () =>
      new Promise<void>((resolve) => {
        const check = () => {
          if (proxiedRequests.every(({ finished }) => finished)) {
            resolve()
            return
          }
          setTimeout(check, 20)
        }
        check()
      }),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
