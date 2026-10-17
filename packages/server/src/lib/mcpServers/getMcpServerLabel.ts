import { normalizeMcpServerName } from '@/lib/mcpServers/normalizeMcpServerName'

export const getMcpServerLabel = ({
  id,
  name,
}: {
  id: string
  name: string | null | undefined
}) => {
  // Normalizing keeps the length, so a non-empty name stays non-empty.
  if (name) {
    return normalizeMcpServerName(name)
  }

  return `mcp-server-${id}`
}
