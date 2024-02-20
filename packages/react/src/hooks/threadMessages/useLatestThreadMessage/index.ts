import { useMemo } from 'react'
import { useThreadMessages } from '@/hooks/threadMessages/useThreadMessages'

export const useLatestThreadMessage = () => {
  const props = useThreadMessages()

  return useMemo(() => ({
    ...props,
    latestThreadMessage: props.threadMessages[0] || null,
  }), [props])
}
