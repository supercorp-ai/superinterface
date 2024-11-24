import Cookies from 'js-cookie'
import { key } from '@/lib/threadIdStorage/key'

export const remove = ({
  assistantId,
}: {
  assistantId: string
}) => (
  Cookies.remove(key({ assistantId }))
)
