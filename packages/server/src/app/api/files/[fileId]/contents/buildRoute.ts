import { type PrismaClient } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { assistantClientAdapter } from '@/lib/assistants/assistantClientAdapter'
import { authorizeFileRequest } from '../../lib/authorizeFileRequest'
import { badRequestResponse } from '../../lib/badRequestResponse'
import { findFileAssistant } from '../../lib/findFileAssistant'
import type { PurposeAssistantsResponse } from './lib/purposeAssistantsResponse'
import { containerFileResponse } from './lib/containerFileResponse'
import { storedFileResponse } from './lib/storedFileResponse'

type AssistantClientAdapter = typeof assistantClientAdapter

export const buildGET =
  ({
    prisma,
    getAssistantClient = assistantClientAdapter,
    purposeAssistantsResponse = () =>
      NextResponse.json({ error: 'No file source found' }, { status: 404 }),
  }: {
    prisma: PrismaClient
    getAssistantClient?: AssistantClientAdapter
    purposeAssistantsResponse?: PurposeAssistantsResponse
  }) =>
  async (
    request: NextRequest,
    props: {
      params: Promise<{
        fileId: string
      }>
    },
  ) => {
    const { fileId } = await props.params
    const { searchParams } = request.nextUrl

    const authorized = await authorizeFileRequest({
      params: searchParams,
      prisma,
    })

    if (authorized.errorResponse) return authorized.errorResponse

    const { assistantId, workspaceAccessWhere } = authorized

    const found = await findFileAssistant({
      prisma,
      assistantId,
      workspaceAccessWhere,
    })

    if (found.errorResponse) return found.errorResponse

    // Without a containerId the file is read from the storage provider's
    // files, so an empty one is a mistake rather than a request for those.
    const containerId = searchParams.get('containerId')

    if (containerId === '') {
      return badRequestResponse({ error: 'Invalid containerId' })
    }

    const assistantClient = getAssistantClient({
      assistant: found.assistant,
      prisma,
    })

    if (containerId !== null) {
      return containerFileResponse({ assistantClient, fileId, containerId })
    }

    return storedFileResponse({
      assistantClient,
      fileId,
      workspaceAccessWhere,
      purposeAssistantsResponse,
    })
  }

export const buildOPTIONS = () => () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
