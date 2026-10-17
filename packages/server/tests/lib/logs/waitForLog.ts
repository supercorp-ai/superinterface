import { prisma } from '@/lib/prisma'
import { waitFor } from '../async/waitFor'

// Route errors are logged in the background, so poll for the log row.
export const waitForLog = ({
  workspaceId,
  message,
}: {
  workspaceId: string
  message: string | RegExp
}) =>
  waitFor({
    check: async () => {
      const logs = await prisma.log.findMany({ where: { workspaceId } })

      return logs.find((log) =>
        typeof message === 'string'
          ? log.message === message
          : message.test(log.message),
      )
    },
  })
