import type { ApiKey } from '@prisma/client'
import { formatApiKeyName } from '@/lib/apiKeys/formatApiKeyName'

export const serializeApiKey = ({ apiKey }: { apiKey: ApiKey }) => ({
  id: apiKey.id,
  type: apiKey.type,
  name: formatApiKeyName({ name: apiKey.name }),
  value: apiKey.value,
  createdAt: apiKey.createdAt.toISOString(),
  updatedAt: apiKey.updatedAt.toISOString(),
})
