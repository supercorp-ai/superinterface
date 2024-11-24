import { key } from '@/lib/threadIdStorage/key'

export const get = ({
  assistantId,
}: {
  assistantId: string
}) => (
  window.localStorage.getItem(key({ assistantId }))
)
