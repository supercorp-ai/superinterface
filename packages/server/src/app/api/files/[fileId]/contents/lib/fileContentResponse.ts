import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'

// Serves file contents with the type and disposition the storage provider
// gave them, or as an inline binary download when it gave none.
export const fileContentResponse = ({
  body,
  upstreamHeaders,
}: {
  body: BodyInit | null
  upstreamHeaders: Headers
}) =>
  new NextResponse(body, {
    headers: {
      ...cacheHeaders,
      'Content-Type':
        upstreamHeaders.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition':
        upstreamHeaders.get('Content-Disposition') ?? 'inline',
    },
  })
