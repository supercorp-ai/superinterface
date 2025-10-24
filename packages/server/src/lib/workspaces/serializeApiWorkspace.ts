import type { Workspace } from '@prisma/client'

export const serializeApiWorkspace = ({
  workspace,
}: {
  workspace: Workspace
}) => ({
  id: workspace.id,
  name: workspace.name,
  createdAt: workspace.createdAt.toISOString(),
  updatedAt: workspace.updatedAt.toISOString(),
})
