import type { PrismaClient } from '@prisma/client'
import { getMcpServerLabel } from '@/lib/mcpServers/getMcpServerLabel'
import { normalizeMcpServerName } from '@/lib/mcpServers/normalizeMcpServerName'
import { isValidMcpServerLabel } from '@/lib/mcpServers/isValidMcpServerLabel'

// Whether another MCP server of the assistant already uses the label,
// compared case-insensitively. Servers without a name are labeled by id.
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

  // Callers only pass labels that already contain an alphanumeric character.
  const targetLower = normalizeMcpServerName(label).toLowerCase()

  return existing.some((server) => {
    const existingLabel = normalizeMcpServerName(getMcpServerLabel(server))

    return (
      isValidMcpServerLabel({ label: existingLabel }) &&
      existingLabel.toLowerCase() === targetLower
    )
  })
}
