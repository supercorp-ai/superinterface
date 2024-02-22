import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useHandleAction } from '@/hooks/actions/useHandleAction'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

export const useManageActions = () => {
  const queryClient = useQueryClient()
  const threadContext = useThreadContext()
  const latestRunProps = useLatestRun()
  const handleActionProps = useHandleAction()

  useEffect(() => {
    if (handleActionProps.isPending) return
    if (latestRunProps.isFetching) return
    if (!latestRunProps.latestRun) return
    if (latestRunProps.latestRun.status !== 'requires_action') return

    const isMutating = queryClient.isMutating({
      mutationKey: ['handleAction', threadContext.variables],
    })

    if (isMutating) return

    console.log('requires action', {
      latestRunProps,
    })

    handleActionProps.handleAction({
      latestRun: latestRunProps.latestRun,
    })
  }, [
    handleActionProps,
    latestRunProps,
  ])

  return null
}
