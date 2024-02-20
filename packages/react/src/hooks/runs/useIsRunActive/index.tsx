import { useMemo } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { isRunEditingThreadMessage } from '@/lib/runs/isRunEditingThreadMessage'

const statuses = [
  'queued',
  'in_progress',
  'cancelling',
  'requires_action',
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
  if (statuses.includes(latestRunProps.latestRun.status)) return true

  return isRunEditingThreadMessage({ threadMessage: latestThreadMessageProps.latestThreadMessage })
}

type Args = {
  [key: string]: any
}

export const useIsRunActive = (args: Args) => {
  const latestRunProps = useLatestRun(args)
  const latestThreadMessageProps = useLatestThreadMessage(args)
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
