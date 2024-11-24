import { key } from '@/lib/threadIdStorage/key'

export const set = ({
  assistantId,
  threadId,
}: {
  assistantId: string
  threadId: string
}) => (
  window.localStorage.setItem(key({ assistantId }), threadId)
)
