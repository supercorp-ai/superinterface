import type { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'

export type ContainerFileRef = {
  containerId: string
  fileId: string
}

/**
 * Streams a live code-interpreter container file through Superinterface.
 * The bytes remain hosted by the model provider; Superinterface does not
 * persist a copy.
 */
export const serveContainerFileContent = async ({
  client,
  containerRef,
}: {
  client: OpenAI
  containerRef: ContainerFileRef
}): Promise<NextResponse> => {
  let response: Response
  try {
    response = await client.containers.files.content.retrieve(
      containerRef.fileId,
      { container_id: containerRef.containerId },
    )
  } catch (error: unknown) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
        ? (error as { status: number }).status
        : 500
    if (status === 404 || status === 410) {
      return NextResponse.json(
        {
          error: 'File expired or not found',
          code: 'container_file_unavailable',
        },
        { status: 404 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch container file' },
      { status: 500 },
    )
  }

  return new NextResponse(response.body, {
    headers: {
      ...cacheHeaders,
      'Content-Type':
        response.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition':
        response.headers.get('Content-Disposition') ?? 'inline',
    },
  })
}
