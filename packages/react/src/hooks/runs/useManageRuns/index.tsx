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
    console.log({ latestRunProps, latestMessageProps, createRunProps })
    if (createRunProps.isPending) return
    if (latestRunProps.isFetching) return
    if (latestMessageProps.isFetching) return

    console.log('mid')
    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'user') return
    if (isOptimistic({ id: latestMessageProps.latestMessage.id })) return

    // console.log('end', {
    //  finalR: !latestRunProps.latestRun || (latestMessageProps.latestMessage.created_at > latestRunProps.latestRun.created_at),
    //   latest: !latestRunProps.latestRun,
    //   here: (latestMessageProps.latestMessage.created_at > latestRunProps.latestRun.created_at),
    //   MES: latestMessageProps.latestMessage.created_at,
    //   RUN: latestRunProps.latestRun.created_at,
    // })

    if (!latestRunProps.latestRun || (latestMessageProps.latestMessage.created_at > latestRunProps.latestRun.created_at)) {
      console.log('creating run')
      if (latestRunProps.latestRun){
        console.log({
          mes: latestMessageProps.latestMessage.created_at,
          run: latestRunProps.latestRun.created_at,
          final: latestMessageProps.latestMessage.created_at > latestRunProps.latestRun.created_at
        })
      }
      createRunProps.createRun(args)
    }
  }, [
    createRunProps,
    latestRunProps,
    latestMessageProps,
  ])

  return null
}
