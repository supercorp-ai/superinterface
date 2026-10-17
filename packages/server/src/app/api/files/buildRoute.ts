import { type PrismaClient } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { authorizeFileRequest } from './lib/authorizeFileRequest'
import { badRequestResponse } from './lib/badRequestResponse'
import { findFileAssistant } from './lib/findFileAssistant'
import { createAssistantFile } from './lib/createAssistantFile'

export const buildPOST =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest) => {
    const formData = await request.formData()

    const authorized = await authorizeFileRequest({ params: formData, prisma })

    if (authorized.errorResponse) return authorized.errorResponse

    const { assistantId, workspaceAccessWhere } = authorized

    const file = formData.get('file')

    if (!file) {
      return badRequestResponse({ error: 'No file found' })
    }

    const found = await findFileAssistant({
      prisma,
      assistantId,
      workspaceAccessWhere,
    })

    if (found.errorResponse) return found.errorResponse

    const createFileResponse = await createAssistantFile({
      assistant: found.assistant,
      prisma,
      file,
      purpose: formData.get('purpose'),
    })

    return NextResponse.json(
      {
        file: createFileResponse,
      },
      { headers: cacheHeaders },
    )
  }

export const buildOPTIONS = () => () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
