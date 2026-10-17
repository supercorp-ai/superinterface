import type OpenAI from 'openai'
import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { fileContentResponse } from './fileContentResponse'
import type { PurposeAssistantsResponse } from './purposeAssistantsResponse'

// Serves a file from the storage provider's files, leaving assistants-purpose
// files to purposeAssistantsResponse.
export const storedFileResponse = async ({
  assistantClient,
  fileId,
  workspaceAccessWhere,
  purposeAssistantsResponse,
}: {
  assistantClient: OpenAI
  fileId: string
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
  purposeAssistantsResponse: PurposeAssistantsResponse
}) => {
  const { files } = assistantClient
  const file = await files.retrieve(fileId)

  if (!file) {
    return NextResponse.json({ error: 'No file found' }, { status: 404 })
  }

  if (file.purpose === 'assistants') {
    return purposeAssistantsResponse({ file, workspaceAccessWhere })
  }

  const fileContentsResponse = await files.content(fileId)

  return fileContentResponse({
    body: await fileContentsResponse.arrayBuffer(),
    upstreamHeaders: fileContentsResponse.headers,
  })
}
