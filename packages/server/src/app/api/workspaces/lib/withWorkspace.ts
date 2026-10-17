import type { PrismaClient, Workspace } from '@prisma/client'
import { NextResponse } from 'next/server'
import type { WorkspaceWhere } from './WorkspaceWhere'

// Responds with the scoped workspace, or with the not found error when the
// authorized organization has no such workspace. `where` comes from
// authorizeWorkspaceRequest.
export const withWorkspace = async ({
  prisma,
  where,
  respond,
}: {
  prisma: PrismaClient
  where: WorkspaceWhere
  respond: (workspace: Workspace) => Promise<NextResponse> | NextResponse
}) => {
  const workspace = await prisma.workspace.findFirst({ where })

  if (!workspace) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
  }

  return respond(workspace)
}
