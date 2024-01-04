import {
  UseInfiniteQueryOptions,
  UseMutationOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { useManageRuns } from '@/hooks/runs/useManageRuns'
import { usePolling } from '@/hooks/runs/usePolling'
import { useManageActions } from '@/hooks/actions/useManageActions'
import { MessagesPage, RunsPage, Run } from '@/types'

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  createRunMutationOptions: UseMutationOptions<{ run: Run }>
  handleActionMutationOptions: UseMutationOptions<{ run: Run }>
}

export const useManageLifecycle = ({
  messagesQueryOptions,
  runsQueryOptions,
  createRunMutationOptions,
  handleActionMutationOptions,
}: Args) => {
  useManageRuns({
    messagesQueryOptions,
    runsQueryOptions,
    createRunMutationOptions,
  })

  useManageActions({
    runsQueryOptions,
    handleActionMutationOptions,
  })

  usePolling({
    messagesQueryOptions,
    runsQueryOptions,
  })

  return null
}
