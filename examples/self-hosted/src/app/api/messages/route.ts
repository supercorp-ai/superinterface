import { type NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  messagesResponse,
  createMessageResponse,
} from '@superinterface/react/server'
import { enqueueJson } from '@superinterface/react/utils'

export const GET = async (request: NextRequest) => {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const searchParams = request.nextUrl.searchParams
  const threadId = searchParams.get('threadId') || null

  if (!threadId) {
    return NextResponse.json({
      data: [],
      hasNextPage: false,
      lastId: null,
    })
  }

  const pageParam = searchParams.get('pageParam') || null

  return NextResponse.json(
    await messagesResponse({
      threadId,
      // @ts-expect-error OpenAI is not typed correctly here
      client,
      ...(pageParam ? { pageParam } : {}),
    }),
  )
}

export const POST = async (request: NextRequest) => {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const { threadId, content } = await request.json()

  let thread: OpenAI.Beta.Thread | null = null

  if (threadId) {
    thread = await client.beta.threads.retrieve(threadId)
  } else {
    thread = await client.beta.threads.create({
      messages: [],
    })
  }

  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content,
  })

  const createRunStream = await client.beta.threads.runs.create(thread.id, {
    assistant_id: process.env.NEXT_PUBLIC_ASSISTANT_ID!,
    instructions:
      'You are a Superinterface self-hosted assistant example. Tell that about yourself if asked.',
    model: 'gpt-4.1-mini',
    stream: true,
  })

  return new Response(
    createMessageResponse({
      client,
      createRunStream,
      handleToolCall: () => {
        throw new Error('No tool calls expected in this example')
      },
      onStart: ({
        controller,
      }: {
        controller: ReadableStreamDefaultController
      }) => {
        if (threadId) return
        if (!thread) return

        return enqueueJson({
          controller,
          value: {
            event: 'thread.created',
            data: {
              ...thread,
              metadata: {
                ...thread.metadata,
                // add these because default Superinterface threadIdStorage expects it
                assistantId: process.env.NEXT_PUBLIC_ASSISTANT_ID!,
                threadId: thread.id,
              },
            },
          },
        })
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    },
  )
}
