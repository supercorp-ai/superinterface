import type { Log } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// createLog is fire-and-forget, so poll until a matching log row shows up.
export const waitForAssistantLog = async ({
  assistantId,
  match,
  timeoutMs = 5000,
}: {
  assistantId: string
  match: (log: Log) => boolean
  timeoutMs?: number
}) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const logs = await prisma.log.findMany({ where: { assistantId } })
    const log = logs.find(match)
    if (log) return log
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error(`No matching log for assistant ${assistantId}`)
}
