import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiFunction } from '@/lib/functions/serializeApiFunction'
import type { functionInclude } from '@/lib/functions/functionInclude'

export const functionResponse = ({
  fn,
}: {
  fn: Prisma.FunctionGetPayload<{ include: typeof functionInclude }>
}) =>
  NextResponse.json(
    {
      function: serializeApiFunction({ fn }),
    },
    { headers: cacheHeaders },
  )
