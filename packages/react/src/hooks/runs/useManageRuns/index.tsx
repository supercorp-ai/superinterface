import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useCreateRun } from '@/hooks/runs/useCreateRun'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

export const useManageRuns = () => {
  const queryClient = useQueryClient()
  const latestRunProps = useLatestRun()
  const latestMessageProps = useLatestMessage()
  const createRunProps = useCreateRun()
  const threadContext = useThreadContext()

  useEffect(() => {
    if (createRunProps.isPending) return
    if (latestRunProps.isFetching) return
    if (latestMessageProps.isFetching) return

    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'user') return
    if (isOptimistic({ id: latestMessageProps.latestMessage.id })) return
    if (latestRunProps.latestRun && latestRunProps.latestRun.created_at > latestMessageProps.latestMessage.created_at) {
      return
    }

    const isMutating = queryClient.isMutating({
      mutationKey: ['createRun', threadContext.variables],
    })

    if (isMutating) return

    // @ts-ignore-next-line
    createRunProps.createRun()
  }, [
    threadContext,
    queryClient,
    createRunProps,
    latestRunProps,
    latestMessageProps,
  ])

  return null
}
