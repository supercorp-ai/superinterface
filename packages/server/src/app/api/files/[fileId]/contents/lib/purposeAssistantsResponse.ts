import type { OpenAI } from 'openai'
import type { Prisma } from '@prisma/client'
import type { NextResponse } from 'next/server'

// Answers for a file stored for the assistants purpose, whose contents the
// storage provider does not serve.
export type PurposeAssistantsResponse = ({
  file,
  workspaceAccessWhere,
}: {
  file: OpenAI.Files.FileObject
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
}) => Promise<NextResponse> | NextResponse
