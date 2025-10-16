import type { PrismaClient } from '@prisma/client'
import { getMcpServerLabel } from '@/lib/mcpServers/getMcpServerLabel'
import { normalizeMcpServerName } from '@/lib/mcpServers/normalizeMcpServerName'

export const isMcpServerLabelTaken = async ({
  prisma,
  assistantId,
  label,
  excludeMcpServerId,
}: {
  prisma: PrismaClient
  assistantId: string
  label: string
  excludeMcpServerId?: string
}) => {
  const existing = await prisma.mcpServer.findMany({
    where: {
      assistantId,
      ...(excludeMcpServerId
        ? {
            NOT: {
              id: excludeMcpServerId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
    },
  })

  const normalizedTarget = normalizeMcpServerName(label)

  if (!/[a-zA-Z0-9]/.test(normalizedTarget)) {
    return false
  }

  const targetLower = normalizedTarget.toLowerCase()

  return existing.some((server) => {
    const normalizedExisting = server.name
      ? normalizeMcpServerName(server.name)
      : null

    if (normalizedExisting && /[a-zA-Z0-9]/.test(normalizedExisting)) {
      if (normalizedExisting.toLowerCase() === targetLower) {
        return true
      }
    }

    const fallback = getMcpServerLabel({
      id: server.id,
      name: server.name,
    })
    const normalizedFallback = normalizeMcpServerName(fallback)

    return (
      /[a-zA-Z0-9]/.test(normalizedFallback) &&
      normalizedFallback.toLowerCase() === targetLower
    )
  })
}
