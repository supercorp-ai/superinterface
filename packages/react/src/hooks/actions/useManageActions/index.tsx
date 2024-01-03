import {
  UseInfiniteQueryOptions,
  InfiniteData,
  UseMutationOptions,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useHandleAction } from '@/hooks/actions/useHandleAction'
import { RunsPage, Run } from '@/types'

type Args = {
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  handleActionMutationOptions: UseMutationOptions<{ run: Run }>
}

export const useManageActions = ({
  runsQueryOptions,
  handleActionMutationOptions,
}: Args) => {
  const latestRunProps = useLatestRun({
    runsQueryOptions,
  })

  const handleActionProps = useHandleAction({
    handleActionMutationOptions,
  })

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
