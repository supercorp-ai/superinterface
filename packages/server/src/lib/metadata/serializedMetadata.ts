import type { serializeMetadata } from './serializeMetadata'

// Variables with every value serialized to a string, as storage providers
// keep metadata.
export type SerializedMetadata = ReturnType<typeof serializeMetadata>
