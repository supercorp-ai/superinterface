import Cookies from 'js-cookie'
import { key } from '@/lib/threadIdStorage/key'

export const get = ({
  assistantId,
}: {
  assistantId: string
}) => (
  Cookies.get(key({ assistantId })) ?? null
)
