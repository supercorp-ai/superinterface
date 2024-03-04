import { useMemo } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { isRunEditingMessage } from '@/lib/runs/isRunEditingMessage'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { usePollingContext } from '@/hooks/runs/usePollingContext'

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
  pollingContext,
  latestRunProps,
  latestMessageProps,
  isMutating,
}: {
  pollingContext: ReturnType<typeof usePollingContext>,
  latestRunProps: ReturnType<typeof useLatestRun>,
  latestMessageProps: ReturnType<typeof useLatestMessage>,
  isMutating: boolean,
}) => {
  if (pollingContext.isPollRefetching) return true
  // @ts-ignore-next-line
  if (latestMessageProps.latestMessage?.metadata?.isBlocking) return false
  if (isMutating) return true
  if (!latestRunProps.latestRun) return false
  if (progressStatuses.includes(latestRunProps.latestRun.status)) return true
  if (stoppedStatuses.includes(latestRunProps.latestRun.status)) return false

  return isRunEditingMessage({ message: latestMessageProps.latestMessage })
}

export const useIsRunActive = () => {
  const latestRunProps = useLatestRun()
  const latestMessageProps = useLatestMessage()
  const threadContext = useThreadContext()
  const pollingContext = usePollingContext()
  const isMutatingCreateRun = useIsMutating({
    mutationKey: ['createRun', threadContext.variables],
  })
  const isMutatingCreateMessage = useIsMutating({
    mutationKey: ['createMessage', threadContext.variables],
  })
  const isMutatingCreateHandleAction = useIsMutating({
    mutationKey: ['handleAction', threadContext.variables],
  })

  return useMemo(() => ({
    ...latestRunProps,
    isRunActive: isRunActive({
      pollingContext,
      latestRunProps,
      latestMessageProps,
      isMutating: isMutatingCreateRun > 0 || isMutatingCreateMessage > 0 || isMutatingCreateHandleAction > 0,
    }),
  }), [
    latestRunProps,
    latestMessageProps,
    pollingContext,
    isMutatingCreateRun,
    isMutatingCreateMessage,
    isMutatingCreateHandleAction,
  ])
}
