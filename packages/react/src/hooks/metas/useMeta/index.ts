import {
  useQueryClient,
} from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const useMeta = () => {
  const superinterfaceContext = useSuperinterfaceContext()
  const queryClient = useQueryClient()

  return {
    meta: {
      queryClient,
      superinterfaceContext,
    },
  }
}
