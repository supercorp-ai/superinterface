import type { SerializedMetadata } from '@/lib/metadata/serializedMetadata'

// The metadata a thread is stored with: the ids it is known by, then the
// variables, which can override them.
export const threadMetadata = ({
  assistantId,
  threadId,
  metadata,
}: {
  assistantId: string
  threadId: string
  metadata: SerializedMetadata
}) => ({
  assistantId,
  threadId,
  ...metadata,
})
