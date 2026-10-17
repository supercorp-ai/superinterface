import {
  fakeMessage,
  fakeRun,
  startFakeOpenai,
  type FakeOpenaiEvent,
  type FakeOpenaiHandler,
} from '../../../../server/tests/lib/openai/startFakeOpenai'

export type FakeAssistantsReply = {
  text: string
  // `null` leaves the annotations list out of the message.
  annotations?: unknown[] | null
  metadata?: Record<string, string>
  runSteps?: (args: {
    threadId: string
    runId: string
    messageId: string
  }) => unknown[]
  // Replaces the streamed events, e.g. to stop mid-run.
  events?: (args: {
    run: ReturnType<typeof fakeRun>
    message: { id: string; [key: string]: unknown }
  }) => FakeOpenaiEvent[]
  // Keeps the stream open until it resolves.
  waitFor?: Promise<unknown>
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: string; [key: string]: unknown }

const messageContent = ({ content }: { content: string | ContentPart[] }) => {
  if (!Array.isArray(content)) {
    return [{ type: 'text', text: { value: content, annotations: [] } }]
  }

  return content.map((part) =>
    part.type === 'text'
      ? { type: 'text', text: { value: part.text, annotations: [] } }
      : part,
  )
}

// A stateful stand-in for the (Azure) OpenAI Assistants API: it keeps the
// messages of each thread, and every run streams the next of `replies` as a
// completed assistant message, annotations, metadata and run steps included.
// Uploaded files are echoed back with their name and purpose.
export const startFakeAssistantsApi = async ({
  replies,
  history = [],
  handle,
}: {
  replies: FakeAssistantsReply[]
  // Earlier assistant messages each new thread starts with, oldest first.
  history?: string[]
  handle?: FakeOpenaiHandler
}) => {
  const threadMessages = new Map<string, unknown[]>()
  const runSteps = new Map<string, unknown[]>()
  let replyIndex = 0
  let uploadIndex = 1

  const messagesOf = ({ threadId }: { threadId: string }) => {
    if (!threadMessages.has(threadId)) threadMessages.set(threadId, [])
    return threadMessages.get(threadId)!
  }

  const fake = await startFakeOpenai({
    handle: async (args) => {
      const custom = await handle?.(args)
      if (custom) return custom

      const { method, path, body, query } = args.request

      if (method === 'POST' && path === '/files') {
        // Echo the uploaded file's name and purpose from the multipart body.
        const field = ({ name }: { name: string }) =>
          String(body).match(
            new RegExp(
              `name="${name}"(?:; filename="([^"]*)")?\\r\\n(?:[^\\r]*\\r\\n)*?\\r\\n([^\\r]*)`,
            ),
          )
        const file = field({ name: 'file' })
        return {
          type: 'json',
          json: {
            id: `file-${uploadIndex++}`,
            object: 'file',
            bytes: file?.[2]?.length ?? 0,
            created_at: Math.floor(Date.now() / 1000),
            filename: file?.[1] ?? 'upload',
            purpose: field({ name: 'purpose' })?.[2] ?? 'assistants',
            status: 'processed',
          },
        }
      }

      const [resource, threadId, collection, ...rest] = path
        .split('/')
        .filter(Boolean)
      if (resource !== 'threads') return undefined

      if (method === 'POST' && !threadId) {
        const id = `thread_${threadMessages.size + 1}_${Date.now()}`
        threadMessages.set(
          id,
          history.map((text) => fakeMessage({ threadId: id, text })),
        )
        return {
          type: 'json',
          json: {
            id,
            object: 'thread',
            created_at: Math.floor(Date.now() / 1000),
            metadata: body?.metadata ?? {},
            tool_resources: null,
          },
        }
      }

      if (!threadId) return undefined

      if (collection === 'messages' && !rest.length) {
        const messages = messagesOf({ threadId })

        if (method === 'POST') {
          const message = {
            ...fakeMessage({ threadId, text: '', role: body.role }),
            content: messageContent({ content: body.content }),
            metadata: body.metadata ?? {},
            attachments: body.attachments ?? [],
          }
          messages.push(message)
          return { type: 'json', json: message }
        }

        const ordered = (
          query.get('order') === 'asc' ? messages : [...messages].reverse()
        ) as { id: string }[]
        const after = ordered.findIndex(({ id }) => id === query.get('after'))
        const limit = Number(query.get('limit') ?? 20)
        const data = ordered.slice(after + 1, after + 1 + limit)
        return {
          type: 'json',
          json: {
            object: 'list',
            data,
            first_id: data[0]?.id ?? null,
            last_id: data[data.length - 1]?.id ?? null,
            has_more: after + 1 + limit < ordered.length,
          },
        }
      }

      if (collection === 'runs' && rest[1] === 'steps' && method === 'GET') {
        return {
          type: 'json',
          json: {
            object: 'list',
            data: runSteps.get(rest[0]) ?? [],
            first_id: null,
            last_id: null,
            has_more: false,
          },
        }
      }

      if (collection === 'runs' && !rest.length && method === 'POST') {
        const reply = replies[replyIndex++] ?? { text: 'Done.' }
        const run = fakeRun({ threadId })
        const message = {
          ...fakeMessage({ threadId, text: reply.text, runId: run.id }),
          content: [
            {
              type: 'text',
              text: {
                value: reply.text,
                ...(reply.annotations === null
                  ? {}
                  : { annotations: reply.annotations ?? [] }),
              },
            },
          ],
          metadata: reply.metadata ?? {},
        }
        messagesOf({ threadId }).push(message)
        // Listed newest first, like the Assistants API does.
        const steps =
          reply.runSteps?.({
            threadId,
            runId: run.id,
            messageId: message.id,
          }) ?? []
        runSteps.set(run.id, steps)

        if (reply.events) {
          return {
            type: 'sse',
            events: reply.events({ run, message }),
            waitFor: reply.waitFor,
          }
        }

        return {
          type: 'sse',
          waitFor: reply.waitFor,
          events: [
            { event: 'thread.run.created', data: { ...run, status: 'queued' } },
            { event: 'thread.run.in_progress', data: run },
            {
              event: 'thread.message.created',
              data: { ...message, status: 'in_progress' },
            },
            { event: 'thread.message.completed', data: message },
            ...[...steps].reverse().map((step) => ({
              event: 'thread.run.step.created',
              data: step,
            })),
            {
              event: 'thread.run.completed',
              data: { ...run, status: 'completed' },
            },
          ],
        }
      }

      return undefined
    },
  })

  return fake
}
