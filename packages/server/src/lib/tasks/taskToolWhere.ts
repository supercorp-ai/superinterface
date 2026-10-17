import { workspaceTasksWhere } from './workspaceTasksWhere'

export const taskToolWhere = ({
  key,
  workspaceId,
}: {
  key: string
  workspaceId: string
}) => ({
  key,
  ...workspaceTasksWhere({ workspaceId }),
})
