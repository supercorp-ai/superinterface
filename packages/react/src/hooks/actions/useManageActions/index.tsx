import { useEffect } from 'react'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useHandleAction } from '@/hooks/actions/useHandleAction'

type Args = {
  [key: string]: any
}

export const useManageActions = (args: Args) => {
  const latestRunProps = useLatestRun(args)
  // @ts-ignore-next-line
  const handleActionProps = useHandleAction(args)

  useEffect(() => {
    if (handleActionProps.isPending) return
    if (latestRunProps.isFetching) return
    if (!latestRunProps.latestRun) return
    if (latestRunProps.latestRun.status !== 'requires_action') return

    console.log('requires action', {
      latestRunProps,
    })

    // @ts-ignore-next-line
    handleActionProps.handleAction({ latestRun: latestRunProps.latestRun })
  }, [handleActionProps, latestRunProps])

  return null
}
