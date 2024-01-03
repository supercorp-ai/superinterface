import { queryKey as messagesQueryKey } from '@/hooks/messages/useMessages/lib/queryOptions/queryKey'
import { Response } from './mutationFn'

type Args = {
  queryClient: any
}

export const onSettled = ({
  queryClient,
}: Args) => async (response: Response | undefined) => {
  if (!response) return

  await queryClient.invalidateQueries({
    queryKey: messagesQueryKey(),
  })
}
