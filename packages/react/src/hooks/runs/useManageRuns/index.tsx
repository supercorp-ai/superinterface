import {
  UseInfiniteQueryOptions,
  UseMutationOptions,
  InfiniteData,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useLatestRun } from '@/hooks/runs/useLatestRun'
import { useManageActions } from '@/hooks/actions/useManageActions'
import { useCreateRun } from '@/hooks/runs/useCreateRun'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { MessagesPage, RunsPage, Run } from '@/types'

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  createRunMutationOptions: UseMutationOptions<{ run: Run }>
  handleActionMutationOptions: UseMutationOptions<{ run: Run }>
}

export const useManageRuns = ({
  messagesQueryOptions,
  runsQueryOptions,
  createRunMutationOptions,
  handleActionMutationOptions,
}: Args) => {
  const latestRunProps = useLatestRun({
    runsQueryOptions,
  })

  const latestMessageProps = useLatestMessage({
    messagesQueryOptions,
  })

  useManageActions({
    runsQueryOptions,
    handleActionMutationOptions,
  })

  const createRunProps = useCreateRun({
    createRunMutationOptions,
  })

  useEffect(() => {
    if (createRunProps.isPending) return
    if (latestRunProps.isFetching) return
    if (latestMessageProps.isFetching) return

    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'user') return
    if (isOptimistic({ id: latestMessageProps.latestMessage.id })) return

    if (!latestRunProps.latestRun || (latestMessageProps.latestMessage.created_at > latestRunProps.latestRun.created_at)) {
      createRunProps.createRun()
    }
  }, [
    createRunProps,
    latestRunProps,
    latestMessageProps,
  ])

  return null
}
