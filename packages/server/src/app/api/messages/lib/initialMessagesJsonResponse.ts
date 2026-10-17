import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { initialMessagesResponse } from './initialMessagesResponse'

export const initialMessagesJsonResponse = async ({
  assistant,
}: Parameters<typeof initialMessagesResponse>[0]) =>
  NextResponse.json(await initialMessagesResponse({ assistant }), {
    headers: cacheHeaders,
  })
