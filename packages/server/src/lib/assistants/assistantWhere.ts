export const assistantWhere = ({
  assistantId,
  workspaceId,
}: {
  assistantId: string
  workspaceId: string
}) => ({
  id: assistantId,
  workspaceId,
})
