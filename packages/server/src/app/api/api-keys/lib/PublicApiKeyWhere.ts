import type { ApiKeyType } from '@prisma/client'

// A public api key scoped to the authorized workspace. Only
// authorizeApiKeyRequest builds it, so helpers taking it never reach private
// keys or keys of other workspaces.
export type PublicApiKeyWhere = {
  id: string
  type: typeof ApiKeyType.PUBLIC
  workspaceId: string
}
