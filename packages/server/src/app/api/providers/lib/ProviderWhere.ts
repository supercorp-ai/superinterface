// A provider scoped to the authorized workspace. Only
// authorizeProviderRequest builds it, so helpers taking it never reach
// providers of other workspaces.
export type ProviderWhere = { id: string; workspaceId: string }
