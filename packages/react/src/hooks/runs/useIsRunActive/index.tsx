import { useMemo } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { isRunEditingThreadMessage } from '@/lib/runs/isRunEditingThreadMessage'

const progressStatuses = [
  'queued',
  'in_progress',
  'cancelling',
  'requires_action',
]

const stoppedStatuses = [
  'expired',
  'cancelled',
  'failed',
]

const isRunActive = ({
  latestRunProps,
  latestThreadMessageProps,
  isMutating,
}: {
  latestRunProps: ReturnType<typeof useLatestRun>,
  latestThreadMessageProps: ReturnType<typeof useLatestThreadMessage>,
  isMutating: number,
}) => {
  // @ts-ignore-next-line
  if (latestThreadMessageProps.latestThreadMessage?.metadata?.isBlocking) return false
  if (isMutating > 0) return true
  if (!latestRunProps.latestRun) return false
  if (progressStatuses.includes(latestRunProps.latestRun.status)) return true
  if (stoppedStatuses.includes(latestRunProps.latestRun.status)) return false

  return isRunEditingThreadMessage({ threadMessage: latestThreadMessageProps.latestThreadMessage })
}

export const useIsRunActive = () => {
  const latestRunProps = useLatestRun()
  const latestThreadMessageProps = useLatestThreadMessage()
  const isMutating = useIsMutating()

  return useMemo(() => ({
    ...latestRunProps,
    isRunActive: isRunActive({
      latestRunProps,
      latestThreadMessageProps,
      isMutating,
    }),
  }), [latestRunProps, latestThreadMessageProps, isMutating])
}
