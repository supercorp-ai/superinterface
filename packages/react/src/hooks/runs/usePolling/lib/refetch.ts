import { fillOption } from '@/lib/core/fillOption'

type Args = {
  meta: any
  args: any
}

export const refetch = async ({
  meta,
  args,
}: Args) => {
  await meta.queryClient.invalidateQueries({
    queryKey: fillOption({
      value: meta.superinterfaceContext.queryOptions.messages.queryKey,
      key: 'queryKey',
      meta,
      args,
    }),
  })

  await meta.queryClient.invalidateQueries({
    queryKey: fillOption({
      value: meta.superinterfaceContext.queryOptions.runs.queryKey,
      key: 'queryKey',
      meta,
      args,
    }),
  })
}
