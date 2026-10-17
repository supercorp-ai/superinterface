import type { PrismaClient } from '@prisma/client'

export const findWorkspaceThread = async ({
  prisma,
  threadId,
  workspaceId,
}: {
  prisma: PrismaClient
  threadId: string
  workspaceId: string
}) => {
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, assistant: { workspaceId } },
  })

  if (!thread) return { ok: false as const, error: 'Thread not found' }

  return { ok: true as const, thread }
}
