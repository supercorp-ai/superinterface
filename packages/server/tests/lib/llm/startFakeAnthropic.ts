import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'

export type FakeAnthropicReply =
  | { content: string }
  | { toolUses: Array<{ name: string; input: Record<string, unknown> }> }

export type FakeAnthropicRequest = {
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

const contentEvents = ({ reply }: { reply: FakeAnthropicReply }) => {
  if ('content' in reply) {
    return [
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: reply.content },
      },
      { type: 'content_block_stop', index: 0 },
    ]
  }

  return reply.toolUses.flatMap(({ name, input }, index) => [
    {
      type: 'content_block_start',
      index,
      content_block: {
        type: 'tool_use',
        id: `toolu_${randomUUID().replace(/-/g, '')}`,
        name,
        input: {},
      },
    },
    {
      type: 'content_block_delta',
      index,
      delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) },
    },
    { type: 'content_block_stop', index },
  ])
}

// A local stand-in for the Anthropic Messages API (streaming only). Point the
// Anthropic SDK at it with ANTHROPIC_BASE_URL=`baseURL`.
export const startFakeAnthropic = async ({
  replies,
}: {
  replies: FakeAnthropicReply[]
}) => {
  const requests: FakeAnthropicRequest[] = []

  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    const body = await readBody(req)
    requests.push({ path, body })
    const reply = replies[requests.length - 1] ?? { content: 'Done.' }
    const stopReason = 'toolUses' in reply ? 'tool_use' : 'end_turn'

    const events = [
      {
        type: 'message_start',
        message: {
          id: `msg_${randomUUID()}`,
          type: 'message',
          role: 'assistant',
          content: [],
          model: body?.model ?? 'claude-fake',
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      },
      ...contentEvents({ reply }),
      {
        type: 'message_delta',
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: 1 },
      },
      { type: 'message_stop' },
    ]

    res.writeHead(200, { 'content-type': 'text/event-stream' })
    for (const event of events) {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
    }
    res.end()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  return {
    baseURL: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
