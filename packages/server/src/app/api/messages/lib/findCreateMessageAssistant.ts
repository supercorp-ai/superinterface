import type { Prisma, PrismaClient } from '@prisma/client'
import { assistantRunInclude } from '@/lib/assistants/assistantRunInclude'
import { threadsInclude } from './threadsInclude'

export const findCreateMessageAssistant = ({
  prisma,
  assistantId,
  workspaceAccessWhere,
  threadId,
}: {
  prisma: PrismaClient
  assistantId: string
  workspaceAccessWhere: Prisma.WorkspaceWhereInput
  threadId: string | undefined
}) =>
  prisma.assistant.findFirst({
    where: {
      id: assistantId,
      workspace: workspaceAccessWhere,
    },
    include: {
      ...assistantRunInclude,
      threads: threadsInclude({ threadId: threadId ?? null }),
      workspace: {
        include: {
          modelProviders: true,
        },
      },
      initialMessages: {
        orderBy: {
          orderNumber: 'asc',
        },
      },
    },
  })
