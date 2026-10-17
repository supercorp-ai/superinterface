import type { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeApiWorkspace } from '@/lib/workspaces/serializeApiWorkspace'

export const listWorkspacesResponse = async ({
  prisma,
  organizationId,
}: {
  prisma: PrismaClient
  organizationId: string
}) => {
  const workspaces = await prisma.workspace.findMany({
    where: { organizationId },
  })

  return NextResponse.json(
    {
      workspaces: workspaces.map((workspace) =>
        serializeApiWorkspace({ workspace }),
      ),
    },
    { headers: cacheHeaders },
  )
}
