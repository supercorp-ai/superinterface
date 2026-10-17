import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'
import OpenAI from 'openai'
import { createMessageResponse, messagesResponse } from '@/server'
import { enqueueJson } from '@/lib/streams/enqueueJson'
import {
  startFakeOpenai,
  type FakeOpenaiEvent,
} from '../../../../server/tests/lib/openai/startFakeOpenai'

type Json = Record<string, unknown>

type ToolCallHandler = (args: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  run: OpenAI.Beta.Threads.Runs.Run
  controller: ReadableStreamDefaultController
}) =>
  | Promise<{ tool_call_id: string; output: string }>
  | { tool_call_id: string; output: string }

const readJson = async ({ req }: { req: IncomingMessage }) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')

  return raw ? (JSON.parse(raw) as Json) : {}
}

const list = ({ data }: { data: { id: string }[] }) => ({
  object: 'list',
  data,
  first_id: data[0]?.id ?? null,
  last_id: data.at(-1)?.id ?? null,
  has_more: false,
})

// A stand-in for the Superinterface server with an assistant on OpenAI
// Assistants storage: POST/GET /messages run the server helpers this package
// exports (createMessageResponse, messagesResponse) against a fake Assistants
// API, whose run streams, tool output streams, stored messages and run steps
// each test scripts. Use it for event shapes the cloud storage of the e2e
// server never produces (message in_progress, code interpreter steps, ...).
export const startAssistantsApiServer = async ({
  runEvents = () => [],
  runStream,
  // A tool output stream has to end with the run's final state.
  toolOutputEvents = ({ threadId, runId }) => [
    {
      event: 'thread.run.completed',
      data: {
        id: runId,
        object: 'thread.run',
        thread_id: threadId,
        status: 'completed',
      },
    },
  ],
  threadMessages = () => [],
  runSteps = () => [],
  threadMetadata = ({ threadId, assistantId }) => ({ threadId, assistantId }),
  handleToolCall = ({ toolCall }) => ({
    tool_call_id: toolCall.id,
    output: 'done',
  }),
  onEvent,
}: {
  runEvents?: (args: {
    threadId: string
    content: unknown
  }) => FakeOpenaiEvent[]
  // Replaces the Assistants API run stream, e.g. to pause between events.
  runStream?: (args: { threadId: string }) => AsyncIterable<FakeOpenaiEvent>
  toolOutputEvents?: (args: {
    threadId: string
    runId: string
  }) => FakeOpenaiEvent[]
  threadMessages?: (args: { threadId: string }) => { id: string }[]
  runSteps?: (args: { threadId: string; runId: string }) => { id: string }[]
  threadMetadata?: (args: { threadId: string; assistantId: string }) => Json
  handleToolCall?: ToolCallHandler
  // Sees each Assistants API event, e.g. to stream more events than
  // createMessageResponse forwards, as a custom server can.
  onEvent?: (args: {
    controller: ReadableStreamDefaultController
    event: string
    data: unknown
  }) => void
}) => {
  let threadCount = 0
  const messagePosts: Json[] = []
  const clientToolOutputs: Json[] = []

  const fakeOpenai = await startFakeOpenai({
    handle: ({ request }) => {
      const [, threadId, resource, runId, action] = request.path
        .split('/')
        .filter(Boolean)
      const sse = (events: FakeOpenaiEvent[]) => ({
        type: 'sse' as const,
        events,
      })
      const json = (value: unknown) => ({ type: 'json' as const, json: value })

      if (resource === 'runs' && request.method === 'POST') {
        if (!runId) return sse(runEvents({ threadId, content: lastContent }))
        if (action === 'submit_tool_outputs') {
          return sse(toolOutputEvents({ threadId, runId }))
        }
      }
      if (resource === 'messages' && request.method === 'GET') {
        return json(list({ data: threadMessages({ threadId }) }))
      }
      if (resource === 'runs' && !runId) return json(list({ data: [] }))
      if (resource === 'runs' && action === 'steps') {
        return json(list({ data: runSteps({ threadId, runId }) }))
      }

      return undefined
    },
  })
  let lastContent: unknown = null

  // The tests run in jsdom, which the SDK takes for a browser.
  const client = new OpenAI({
    apiKey: 'sk-test',
    baseURL: fakeOpenai.baseURL,
    maxRetries: 0,
    dangerouslyAllowBrowser: true,
  })

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (req.method === 'POST' && url.pathname === '/messages') {
      const body = await readJson({ req })
      messagePosts.push(body)
      lastContent = body.content
      const isThreadCreated = !body.threadId
      const threadId = (body.threadId as string) ?? `thread_${++threadCount}`

      const stream = createMessageResponse({
        client,
        createRunStream: runStream
          ? runStream({ threadId })
          : await client.beta.threads.runs.create(threadId, {
              assistant_id: 'asst_fake',
              stream: true,
            }),
        handleToolCall,
        onEvent,
        onStart: ({ controller }) => {
          if (!isThreadCreated) return

          enqueueJson({
            controller,
            value: {
              event: 'thread.created',
              data: {
                id: threadId,
                object: 'thread',
                created_at: 0,
                metadata: threadMetadata({
                  threadId,
                  assistantId: body.assistantId as string,
                }),
              },
            },
          })
        },
      })
      res.writeHead(200, { 'content-type': 'application/json' })
      Readable.fromWeb(stream as never).pipe(res)
      return
    }

    if (req.method === 'GET' && url.pathname === '/messages') {
      const threadId = url.searchParams.get('threadId')
      const page = threadId
        ? await messagesResponse({ client, threadId })
        : { data: [], hasNextPage: false, lastId: null }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(page))
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/assistants/')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({ assistant: { id: 'asst_fake', name: 'Scripted' } }),
      )
      return
    }

    if (url.pathname === '/threads/runs/submit-client-tool-outputs') {
      clientToolOutputs.push(await readJson({ req }))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ status: 'success' }))
      return
    }

    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({ error: `Unhandled ${req.method} ${url.pathname}` }),
    )
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    messagePosts,
    clientToolOutputs,
    fakeOpenai,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      })
      await fakeOpenai.close()
    },
  }
}
