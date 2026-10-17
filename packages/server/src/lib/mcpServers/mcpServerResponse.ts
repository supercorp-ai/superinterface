import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiMcpServer } from '@/lib/mcpServers/serializeApiMcpServer'

export const mcpServerResponse = ({
  mcpServer,
}: Parameters<typeof serializeApiMcpServer>[0]) =>
  NextResponse.json(
    {
      mcpServer: serializeApiMcpServer({ mcpServer }),
    },
    { headers: cacheHeaders },
  )
