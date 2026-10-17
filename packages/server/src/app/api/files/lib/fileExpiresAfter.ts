import { StorageProviderType } from '@prisma/client'

const thirtyDaysInSeconds = 2592000

// Files uploaded to OpenAI expire 30 days after they are created. Other
// storage providers keep them without an expiry.
export const fileExpiresAfter = ({
  storageProviderType,
}: {
  storageProviderType: StorageProviderType
}) => {
  if (storageProviderType !== StorageProviderType.OPENAI) return {}

  return {
    expires_after: {
      anchor: 'created_at' as const,
      seconds: thirtyDaysInSeconds,
    },
  }
}
