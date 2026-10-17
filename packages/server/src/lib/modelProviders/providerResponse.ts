import type { ModelProvider } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeModelProvider } from '@/lib/modelProviders/serializeModelProvider'

export const providerResponse = ({ provider }: { provider: ModelProvider }) =>
  NextResponse.json(
    { provider: serializeModelProvider({ provider }) },
    { headers: cacheHeaders },
  )
