import { useEffect } from 'react'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useHandleAction } from '@/hooks/actions/useHandleAction'

export const useManageActions = () => {
  const latestRunProps = useLatestRun()
  const handleActionProps = useHandleAction()

  useEffect(() => {
    if (handleActionProps.isPending) return
    if (latestRunProps.isFetching) return
    if (!latestRunProps.latestRun) return
    if (latestRunProps.latestRun.status !== 'requires_action') return

    console.log('requires action', {
      latestRunProps,
    })

    handleActionProps.handleAction({
      latestRun: latestRunProps.latestRun,
    })
  }, [handleActionProps, latestRunProps])

  return null
}
