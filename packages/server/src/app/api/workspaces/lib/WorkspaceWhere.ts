// A workspace scoped to the authorized organization. Only
// authorizeWorkspaceRequest builds it, so helpers taking it never reach
// workspaces of other organizations.
export type WorkspaceWhere = { id: string; organizationId: string }
