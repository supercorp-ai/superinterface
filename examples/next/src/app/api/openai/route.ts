import { type NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  messagesResponse,
} from '@superinterface/react/server'

export const GET = async () => {
  const client = new OpenAI({
    apiKey: 'sk-proj-11111111111111111111',
  })

  const pageParam = null

  const r = await messagesResponse({
    threadId: 'thread_BWZSFgxf4o7x1psewUjwhitt',
    client,
    ...(pageParam ? { pageParam } : {}),
  })

  return NextResponse.json(r)
}
