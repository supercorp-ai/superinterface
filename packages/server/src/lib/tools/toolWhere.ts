import { assistantWhere } from '@/lib/assistants/assistantWhere'

// Matches the tool only when its assistant belongs to the workspace.
export const toolWhere = ({
  toolId,
  assistantId,
  workspaceId,
}: {
  toolId: string
  assistantId: string
  workspaceId: string
}) => ({
  id: toolId,
  assistant: assistantWhere({ assistantId, workspaceId }),
})
