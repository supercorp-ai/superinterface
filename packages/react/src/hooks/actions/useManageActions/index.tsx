import { useEffect, useState } from 'react'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useHandleAction } from '@/hooks/actions/useHandleAction'
// import { usePollingContext } from '@/hooks/runs/usePollingContext'

export const useManageActions = () => {
  const latestRunProps = useLatestRun()
  const handleActionProps = useHandleAction()
  const [handledRunIds, setHandledRunIds] = useState<string[]>([])

  useEffect(() => {
    if (handleActionProps.isPending) return
    if (latestRunProps.isFetching) return
    if (!latestRunProps.latestRun) return
    if (latestRunProps.latestRun.status !== 'requires_action') return
    if (handledRunIds.includes(latestRunProps.latestRun.id)) return

    setHandledRunIds((prev) => [...prev, latestRunProps.latestRun.id])

    console.log('Requires action', {
      latestRunProps,
      handleActionProps,
    })

    handleActionProps.handleAction({
      latestRun: latestRunProps.latestRun,
    })
  }, [
    handledRunIds,
    handleActionProps,
    latestRunProps,
  ])

  return null
}
