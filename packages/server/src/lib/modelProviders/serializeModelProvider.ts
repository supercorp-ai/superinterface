import type { ModelProvider } from '@prisma/client'

export const serializeModelProvider = ({
  provider,
}: {
  provider: ModelProvider
}) => ({
  id: provider.id,
  type: provider.type,
  name: provider.name,
  apiKey: provider.apiKey,
  endpoint: provider.endpoint,
  apiVersion: provider.apiVersion,
  workspaceId: provider.workspaceId,
  createdAt: provider.createdAt.toISOString(),
  updatedAt: provider.updatedAt.toISOString(),
})

export type SerializedModelProvider = ReturnType<typeof serializeModelProvider>
