// Prisma always rejects with an error object; its P2025 code means the
// record to update no longer exists.
export const isRecordNotFoundError = ({ error }: { error: unknown }) =>
  (error as { code?: unknown }).code === 'P2025'
