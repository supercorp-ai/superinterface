import type { z } from 'zod'
import type { createProviderSchema } from './createProviderSchema'

// Fills the omitted provider fields with their empty defaults.
export const providerCreateData = ({
  body,
  workspaceId,
}: {
  body: z.infer<typeof createProviderSchema>
  workspaceId: string
}) => ({
  type: body.type,
  name: body.name ?? '',
  apiKey: body.apiKey ?? '',
  endpoint: body.endpoint ?? null,
  apiVersion: body.apiVersion ?? null,
  azureTenantId: body.azureTenantId ?? null,
  azureClientId: body.azureClientId ?? null,
  azureClientSecret: body.azureClientSecret ?? null,
  workspaceId,
})
