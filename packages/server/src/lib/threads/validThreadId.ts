import { validate } from 'uuid'

const fallbackUuid = '00000000-0000-0000-0000-000000000000'

export const validThreadId = ({ threadId }: { threadId: string | null }) => {
  if (!threadId) return fallbackUuid
  if (!validate(threadId)) return fallbackUuid

  return threadId
}
