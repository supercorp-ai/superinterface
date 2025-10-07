import type { Prisma, PrismaClient } from '@prisma/client'

export const getWorkspaceId = async ({
  workspaceAccessWhere,
  prisma,
}: {
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
  prisma: PrismaClient
}) =>
  (await prisma.workspace.findFirst({
    where: workspaceAccessWhere,
  }))!.id
