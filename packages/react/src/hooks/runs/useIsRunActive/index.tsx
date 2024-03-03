import { useMemo } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { isRunEditingMessage } from '@/lib/runs/isRunEditingMessage'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

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
  latestMessageProps,
  isMutating,
}: {
  latestRunProps: ReturnType<typeof useLatestRun>,
  latestMessageProps: ReturnType<typeof useLatestMessage>,
  isMutating: boolean,
}) => {
  // @ts-ignore-next-line
  if (latestMessageProps.latestMessage?.metadata?.isBlocking) return false
  if (isMutating) return true
  if (latestMessageProps.isRefetching) return true
  if (!latestRunProps.latestRun) return false
  if (progressStatuses.includes(latestRunProps.latestRun.status)) return true
  if (stoppedStatuses.includes(latestRunProps.latestRun.status)) return false

  return isRunEditingMessage({ message: latestMessageProps.latestMessage })
}

export const useIsRunActive = () => {
  const latestRunProps = useLatestRun()
  const latestMessageProps = useLatestMessage()
  const threadContext = useThreadContext()
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
      latestRunProps,
      latestMessageProps,
      isMutating: isMutatingCreateRun > 0 || isMutatingCreateMessage > 0 || isMutatingCreateHandleAction > 0,
    }),
  }), [
    latestRunProps,
    latestMessageProps,
    isMutatingCreateRun,
    isMutatingCreateMessage,
    isMutatingCreateHandleAction,
  ])
}
