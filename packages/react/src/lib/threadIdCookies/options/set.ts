import Cookies from 'js-cookie'
import { key } from '@/lib/threadIdCookies/key'

export const set = ({
  assistantId,
  threadId,
}: {
  assistantId: string
  threadId: string
}) => (
  Cookies.set(key({ assistantId }), threadId, {
    expires: 7,
  })
)
