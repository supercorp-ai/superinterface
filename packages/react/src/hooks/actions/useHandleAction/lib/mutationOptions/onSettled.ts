import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { queryKey as runsQueryKey } from '@/hooks/runs/useRuns/lib/queryOptions/queryKey'
import { Response } from './mutationFn'

type Args = {
  queryClient: any
}

export const onSettled = ({
  queryClient,
}: Args) => (response: Response | undefined) => {
  if (!response) {
    throw new Error('useHandleAction onSettled: response is undefined')
  }

  queryClient.invalidateQueries({
    queryKey: messagesQueryKey(),
  })
  queryClient.invalidateQueries({
    queryKey: runsQueryKey(),
  })
}
