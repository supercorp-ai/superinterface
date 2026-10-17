import type { z } from 'zod'
import type { mcpServerSchema } from '@/lib/mcpServers/mcpServerSchema'
import { mcpServerTransportData } from '@/lib/mcpServers/mcpServerTransportData'

// The MCP server fields from the request body, with its transport nested
// under the given Prisma operation.
export const mcpServerData = <Operation extends 'create' | 'update'>({
  body: { transportType, sseTransport, httpTransport, name, description },
  operation,
}: {
  body: z.infer<typeof mcpServerSchema>
  operation: Operation
}) => ({
  transportType,
  ...(name !== undefined ? { name } : {}),
  ...(description !== undefined ? { description } : {}),
  ...mcpServerTransportData({
    transportType,
    sseTransport,
    httpTransport,
    operation,
  }),
})
