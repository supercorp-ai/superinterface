import {
  useInfiniteQuery as useTanstackInfiniteQuery,
  useMutation as useTanstackMutation,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const useQueryClient = () => {
  const { queryClient } = useSuperinterfaceContext()

  return queryClient
}

export const useInfiniteQuery = (...args: any) => {
  const queryClient = useQueryClient()
  console.log({ queryClient })

  return useTanstackInfiniteQuery({
    ...args,
    queryClient,
  })
}

export const useMutation = (...args: any) => {
  const queryClient = useQueryClient()

  return useTanstackMutation({
    ...args,
    queryClient,
  })
}
