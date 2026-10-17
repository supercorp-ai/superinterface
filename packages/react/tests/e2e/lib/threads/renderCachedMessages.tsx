import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { Thread } from '@/components/threads/Thread'

export const cachedMessagesVariables = { assistantId: 'asst_cached' }

// Renders Thread.Messages over cached messages (newest first) without a
// server: nothing is stale, so nothing is fetched. With `isMutatingMessage`,
// a createMessage mutation for the thread is left pending.
export const renderCachedMessages = ({
  messages,
  isMutatingMessage = false,
}: {
  messages: object[]
  isMutatingMessage?: boolean
}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  queryClient.setQueryData(['messages', cachedMessagesVariables], {
    pageParams: [],
    pages: [{ data: messages, hasNextPage: false, lastId: null }],
  })
  if (isMutatingMessage) {
    queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: ['createMessage', cachedMessagesVariables],
        mutationFn: () => new Promise(() => {}),
      })
      .execute(undefined)
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <SuperinterfaceProvider
          baseUrl="http://127.0.0.1:9"
          variables={cachedMessagesVariables}
        >
          <Thread.Messages />
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>,
  )
}
