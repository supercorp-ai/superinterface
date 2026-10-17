import { assistantWhere } from '@/lib/assistants/assistantWhere'

// Matches the function only when its assistant belongs to the workspace.
export const functionWhere = ({
  functionId,
  assistantId,
  workspaceId,
}: {
  functionId: string
  assistantId: string
  workspaceId: string
}) => ({
  id: functionId,
  assistant: assistantWhere({ assistantId, workspaceId }),
})
