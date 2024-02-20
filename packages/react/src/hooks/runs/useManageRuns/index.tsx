import { useEffect } from 'react'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useCreateRun } from '@/hooks/runs/useCreateRun'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

export const useManageRuns = () => {
  const latestRunProps = useLatestRun()
  const latestThreadMessageProps = useLatestThreadMessage()
  const createRunProps = useCreateRun()

  useEffect(() => {
    if (createRunProps.isPending) return
    if (latestRunProps.isFetching) return
    if (latestThreadMessageProps.isFetching) return

    if (!latestThreadMessageProps.latestThreadMessage) return
    if (latestThreadMessageProps.latestThreadMessage.role !== 'user') return
    if (isOptimistic({ id: latestThreadMessageProps.latestThreadMessage.id })) return

    if (!latestRunProps.latestRun || (latestThreadMessageProps.latestThreadMessage.created_at > latestRunProps.latestRun.created_at)) {
      createRunProps.createRun()
    }
  }, [
    createRunProps,
    latestRunProps,
    latestThreadMessageProps,
  ])

  return null
}
