// import { useCurrentConversationId } from '@/hooks/conversations/useCurrentConversationId'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  SuperinterfaceProvider,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

const queryClient = new QueryClient()

export const Providers = ({
  children,
}: Args) => {
  return (
    <Theme
      accentColor="gray"
      radius="large"
    >
      <SuperinterfaceProvider
        baseUrl="http://localhost:3000/api/cloud"
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SuperinterfaceProvider>
    </Theme>
  )
}

// type QueryFnArgs = {
//   queryKey: [string, {
//     url: string
//     assistantId: string
//     conversationId: string
//   }]
//   pageParam?: string
// }
//
// const endpointQueryOptions = ({
//   url,
// }: {
//   url: string
// }) => ({
//   enabled: ({ conversationId }: { conversationId?: string }) => (
//     !!conversationId
//   ),
//   queryKey: ({
//     assistantId,
//     conversationId,
//   }: {
//     assistantId: string,
//     conversationId?: string,
//   }) => (
//     ['endpoint', {
//       url,
//       assistantId,
//       conversationId,
//     }]
//   ),
//   queryFn: async ({
//     pageParam,
//     queryKey: queryFnQueryKey,
//   }: QueryFnArgs) => {
//     const [_key, { url, assistantId, conversationId }] = queryFnQueryKey
//     const params = new URLSearchParams({
//       pageParam: pageParam || '',
//       assistantId,
//       conversationId,
//     })
//
//     return fetch(`${url}?${params}`).then(res => res.json())
//   },
// })
//
// const endpointMutationOptions = ({
//   url,
// }: {
//   url: string
// }) => ({
//   mutationFn: (data: any) => (
//     fetch(url, {
//       method: 'POST',
//       body: JSON.stringify(data),
//     }).then(res => res.json())
//   ),
// })
//
// const url = ({
//   path,
// }: {
//   path: string
// }) => (
//   `http://localhost:3000${path}`
// )
        // publicApiKey="pk_prod_123"
        // queryOptions={{
        //   threadMessages: endpointQueryOptions({
        //     url: url({ path: '/api/cloud/thread-messages' }),
        //   }),
        //   runs: endpointQueryOptions({
        //     url: url({ path: '/api/cloud/runs' }),
        //   }),
        // }}
        // mutationOptions={{
        //   createThreadMessage: {
        //     ...endpointMutationOptions({
        //       url: url({ path: '/api/cloud/thread-messages' }),
        //     }),
        //     onSuccess: (data: any, variables: any) => {
        //       if (variables.conversationId) return
        //       if (!data.conversationId) return
        //
        //       updateCurrentConversationId(data.conversationId)
        //     },
        //   },
        //   createRun: endpointMutationOptions({
        //     url: url({ path: '/api/cloud/runs' }),
        //   }),
        //   handleAction: endpointMutationOptions({
        //     url: url({ path: '/api/cloud/actions' }),
        //   }),
        // }}
  // const { updateCurrentConversationId } = useCurrentConversationId()
