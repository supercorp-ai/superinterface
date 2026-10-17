import type { ApiKey } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiKey } from '@/lib/apiKeys/serializeApiKey'

export const apiKeyResponse = ({ apiKey }: { apiKey: ApiKey }) =>
  NextResponse.json(
    { apiKey: serializeApiKey({ apiKey }) },
    { headers: cacheHeaders },
  )
