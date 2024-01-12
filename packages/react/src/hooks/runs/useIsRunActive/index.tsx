import { useMemo } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { isRunEditingMessage } from '@/lib/runs/isRunEditingMessage'

const statuses = [
  'queued',
  'in_progress',
  'cancelling',
  'requires_action',
]

const isRunActive = ({
  latestRunProps,
  latestMessageProps,
  isMutating,
}: {
  latestRunProps: ReturnType<typeof useLatestRun>,
  latestMessageProps: ReturnType<typeof useLatestMessage>,
  isMutating: number,
}) => {
  // @ts-ignore-next-line
  if (latestMessageProps.latestMessage?.metadata?.isBlocking) return false
  if (isMutating > 0) return true
  if (!latestRunProps.latestRun) return false
  if (statuses.includes(latestRunProps.latestRun.status)) return true

  return isRunEditingMessage({ message: latestMessageProps.latestMessage })
}

type Args = {
  [key: string]: any
}

export const useIsRunActive = (args: Args) => {
  const latestRunProps = useLatestRun(args)
  const latestMessageProps = useLatestMessage(args)
  const isMutating = useIsMutating()

  return useMemo(() => ({
    ...latestRunProps,
    isRunActive: isRunActive({
      latestRunProps,
      latestMessageProps,
      isMutating,
    }),
  }), [latestRunProps, latestMessageProps, isMutating])
}
