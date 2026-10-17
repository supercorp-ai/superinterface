import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiAssistant } from '@/lib/assistants/serializeApiAssistant'
import type { apiAssistantInclude } from '@/lib/assistants/apiAssistantInclude'

export const apiAssistantResponse = ({
  assistant,
}: {
  assistant: Prisma.AssistantGetPayload<{ include: typeof apiAssistantInclude }>
}) =>
  NextResponse.json(
    {
      assistant: serializeApiAssistant({ assistant }),
    },
    { headers: cacheHeaders },
  )
