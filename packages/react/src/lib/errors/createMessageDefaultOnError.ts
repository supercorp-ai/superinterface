import {
  QueryClient,
} from '@tanstack/react-query'
import { Toast } from '@/types'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

export const createMessageDefaultOnError = ({
  queryClient,
  addToast,
  threadContext,
}: {
  queryClient: QueryClient
  addToast: (toast: Toast) => void
  threadContext: ReturnType<typeof useThreadContext>
}) => (error: any) => {
  if (error.name === 'AbortError') {
    queryClient.invalidateQueries({ queryKey: ['messages', threadContext.variables] })
    queryClient.invalidateQueries({ queryKey: ['runs', threadContext.variables] })
    return
  }

  addToast({ type: 'error', message: error.message })
}
