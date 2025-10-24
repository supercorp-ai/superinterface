import { normalizeMcpServerName } from '@/lib/mcpServers/normalizeMcpServerName'

export const getMcpServerLabel = ({
  id,
  name,
}: {
  id: string
  name: string | null | undefined
}) => {
  if (name) {
    const normalized = normalizeMcpServerName(name)
    if (normalized) {
      return normalized
    }
  }

  return `mcp-server-${id}`
}
