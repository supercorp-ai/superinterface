import type { PrismaClient } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { workspaceResponse } from '@/lib/workspaces/workspaceResponse'
import { withWorkspace } from './withWorkspace'
import type { WorkspaceWhere } from './WorkspaceWhere'

// Applies the JSON body changes to the workspace.
export const updateWorkspaceResponse = async ({
  prisma,
  request,
  where,
}: {
  prisma: PrismaClient
  request: NextRequest
  where: WorkspaceWhere
}) => {
  const parsed = z
    .object({ name: z.string().optional() })
    .safeParse(await request.json())

  if (!parsed.success) {
    return invalidPayloadResponse()
  }

  return withWorkspace({
    prisma,
    where,
    respond: async () =>
      workspaceResponse({
        workspace: await prisma.workspace.update({
          where: { id: where.id },
          data: parsed.data,
        }),
      }),
  })
}
