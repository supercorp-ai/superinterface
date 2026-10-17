import { assistantWhere } from '@/lib/assistants/assistantWhere'

// Matches the MCP server only when its assistant belongs to the workspace.
export const mcpServerWhere = ({
  mcpServerId,
  assistantId,
  workspaceId,
}: {
  mcpServerId: string
  assistantId: string
  workspaceId: string
}) => ({
  id: mcpServerId,
  assistant: assistantWhere({ assistantId, workspaceId }),
})
