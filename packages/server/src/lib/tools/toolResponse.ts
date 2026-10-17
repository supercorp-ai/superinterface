import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiTool } from '@/lib/tools/serializeApiTool'

export const toolResponse = ({
  tool,
}: Parameters<typeof serializeApiTool>[0]) =>
  NextResponse.json(
    {
      tool: serializeApiTool({ tool }),
    },
    { headers: cacheHeaders },
  )
