import { Run } from '@/types'
import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { queryKey as runsQueryKey } from '@/hooks/runs/useRuns/lib/queryOptions/queryKey'

type Args = {
  queryClient: any
  latestRun: Run
}

export const refetch = async ({
  queryClient,
  latestRun,
}: Args) => {
  await queryClient.invalidateQueries({
    queryKey: messagesQueryKey(),
  })
  await queryClient.invalidateQueries({
    queryKey: runsQueryKey(),
  })
}
