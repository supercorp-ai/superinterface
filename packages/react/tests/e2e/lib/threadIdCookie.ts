import Cookies from 'js-cookie'
import { key } from '@/lib/threadIdStorage/key'

// The thread id the default cookie storage remembers for the assistant.
export const threadIdCookie = ({ assistantId }: { assistantId: string }) =>
  Cookies.get(key({ assistantId })) ?? null
