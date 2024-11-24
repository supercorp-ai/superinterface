import { key } from '@/lib/threadIdStorage/key'

export const remove = ({
  assistantId,
}: {
  assistantId: string
}) => (
  window.localStorage.removeItem(key({ assistantId }))
)
