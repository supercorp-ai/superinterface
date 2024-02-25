import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useCreateRun } from '@/hooks/runs/useCreateRun'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

export const useManageRuns = () => {
  const queryClient = useQueryClient()
  const latestRunProps = useLatestRun()
  const latestThreadMessageProps = useLatestThreadMessage()
  const createRunProps = useCreateRun()
  const threadContext = useThreadContext()

  useEffect(() => {
    if (createRunProps.isPending) return
    if (latestRunProps.isFetching) return
    if (latestThreadMessageProps.isFetching) return

    if (!latestThreadMessageProps.latestThreadMessage) return
    if (latestThreadMessageProps.latestThreadMessage.role !== 'user') return
    if (isOptimistic({ id: latestThreadMessageProps.latestThreadMessage.id })) return
    if (latestRunProps.latestRun && latestRunProps.latestRun.created_at > latestThreadMessageProps.latestThreadMessage.created_at) {
      return
    }

    const isMutating = queryClient.isMutating({
      mutationKey: ['createRun', threadContext.variables],
    })

    if (isMutating) return

    createRunProps.createRun()
  }, [
    threadContext,
    queryClient,
    createRunProps,
    latestRunProps,
    latestThreadMessageProps,
  ])

  return null
}
