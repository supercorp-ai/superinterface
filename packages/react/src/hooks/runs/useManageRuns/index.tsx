import { useToasts } from '@/hooks/toasts/useToasts'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useCreateRun } from '@/hooks/runs/useCreateRun'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

export const useManageRuns = () => {
  const { addToast } = useToasts()
  const queryClient = useQueryClient()
  const latestRunProps = useLatestRun()
  const latestMessageProps = useLatestMessage()
  const createRunProps = useCreateRun({
    onError: (error: any) => (
      addToast({ type: 'error', message: error.message })
    ),
  })
  const threadContext = useThreadContext()

  const [toastedErrorRunIds, setToastedErrorRunIds] = useState<string[]>([])

  useEffect(() => {
    if (latestRunProps.latestRun?.status !== 'failed') return
    if (toastedErrorRunIds.includes(latestRunProps.latestRun.id)) return

    setToastedErrorRunIds((prev) => [...prev, latestRunProps.latestRun.id])

    addToast({ type: 'error', message: 'AI run failed. Please try again.' })
  }, [latestRunProps, toastedErrorRunIds, addToast])

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
