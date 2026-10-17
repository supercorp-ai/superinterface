import { NextResponse } from 'next/server'
import type { InitialMessage } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiInitialMessage } from '@/lib/initialMessages/serializeApiInitialMessage'

export const initialMessagesResponse = ({
  initialMessages,
}: {
  initialMessages: InitialMessage[]
}) =>
  NextResponse.json(
    {
      initialMessages: initialMessages.map((initialMessage) =>
        serializeApiInitialMessage({ initialMessage }),
      ),
    },
    { headers: cacheHeaders },
  )
