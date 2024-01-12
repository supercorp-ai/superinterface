import { useEffect } from 'react'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useCreateRun } from '@/hooks/runs/useCreateRun'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

type Args = {
  [key: string]: any
}

export const useManageRuns = (args: Args) => {
  const latestRunProps = useLatestRun(args)
  const latestMessageProps = useLatestMessage(args)
  // @ts-ignore-next-line
  const createRunProps = useCreateRun(args)

  useEffect(() => {
    if (createRunProps.isPending) return
    if (latestRunProps.isFetching) return
    if (latestMessageProps.isFetching) return

    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'user') return
    if (isOptimistic({ id: latestMessageProps.latestMessage.id })) return

    if (!latestRunProps.latestRun || (latestMessageProps.latestMessage.created_at > latestRunProps.latestRun.created_at)) {
      // @ts-ignore-next-line
      createRunProps.createRun(args)
    }
  }, [
    createRunProps,
    latestRunProps,
    latestMessageProps,
  ])

  return null
}
