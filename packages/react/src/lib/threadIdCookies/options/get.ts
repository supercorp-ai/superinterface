import Cookies from 'js-cookie'
import { key } from '@/lib/threadIdCookies/key'

export const get = ({
  assistantId,
}: {
  assistantId: string
}) => (
  Cookies.get(key({ assistantId }))
)
