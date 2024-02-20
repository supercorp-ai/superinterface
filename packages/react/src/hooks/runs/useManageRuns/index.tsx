import { useEffect } from 'react'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useCreateRun } from '@/hooks/runs/useCreateRun'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

type Args = {
  [key: string]: any
}

export const useManageRuns = (args: Args) => {
  const latestRunProps = useLatestRun(args)
  const latestThreadMessageProps = useLatestThreadMessage(args)
  // @ts-ignore-next-line
  const createRunProps = useCreateRun(args)

  useEffect(() => {
    if (createRunProps.isPending) return
    if (latestRunProps.isFetching) return
    if (latestThreadMessageProps.isFetching) return

    if (!latestThreadMessageProps.latestThreadMessage) return
    if (latestThreadMessageProps.latestThreadMessage.role !== 'user') return
    if (isOptimistic({ id: latestThreadMessageProps.latestThreadMessage.id })) return

    if (!latestRunProps.latestRun || (latestThreadMessageProps.latestThreadMessage.created_at > latestRunProps.latestRun.created_at)) {
      // @ts-ignore-next-line
      createRunProps.createRun(args)
    }
  }, [
    createRunProps,
    latestRunProps,
    latestThreadMessageProps,
  ])

  return null
}
