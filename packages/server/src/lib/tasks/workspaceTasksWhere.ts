export const workspaceTasksWhere = ({
  workspaceId,
}: {
  workspaceId: string
}) => ({
  thread: { assistant: { workspaceId } },
})
