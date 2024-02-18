import { useCurrentConversationId } from '@/hooks/conversations/useCurrentConversationId'
import {
  SuperinterfaceProvider,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

type QueryFnArgs = {
  queryKey: [string, {
    url: string
    assistantId: string
    conversationId: string
  }]
  pageParam?: string
}

const endpointQueryOptions = ({
  url,
}: {
  url: string
}) => ({
  enabled: ({ conversationId }: { conversationId?: string }) => (
    !!conversationId
  ),
  queryKey: ({
    assistantId,
    conversationId,
  }: {
    assistantId: string,
    conversationId?: string,
  }) => (
    ['endpoint', {
      url,
      assistantId,
      conversationId,
    }]
  ),
  queryFn: async ({
    pageParam,
    queryKey: queryFnQueryKey,
  }: QueryFnArgs) => {
    const [_key, { url, assistantId, conversationId }] = queryFnQueryKey
    const params = new URLSearchParams({
      pageParam: pageParam || '',
      assistantId,
      conversationId,
    })

    return fetch(`${url}?${params}`).then(res => res.json())
  },
})

const endpointMutationOptions = ({
  url,
}: {
  url: string
}) => ({
  mutationFn: (data: any) => (
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(res => res.json())
  ),
})

const url = ({
  path,
}: {
  path: string
}) => (
  `http://localhost:3000${path}`
)

export const Providers = ({
  children,
}: Args) => {
  const { updateCurrentConversationId } = useCurrentConversationId()

  return (
    <Theme
      accentColor="gray"
      radius="large"
    >
      <SuperinterfaceProvider
        queryOptions={{
          messages: endpointQueryOptions({
            url: url({ path: '/api/cloud/messages' }),
          }),
          runs: endpointQueryOptions({
            url: url({ path: '/api/cloud/runs' }),
          }),
        }}
        mutationOptions={{
          createMessage: {
            ...endpointMutationOptions({
              url: url({ path: '/api/cloud/messages' }),
            }),
            onSuccess: (data: any, variables: any) => {
              if (variables.conversationId) return
              if (!data.conversationId) return

              updateCurrentConversationId(data.conversationId)
            },
          },
          createRun: endpointMutationOptions({
            url: url({ path: '/api/cloud/runs' }),
          }),
          handleAction: endpointMutationOptions({
            url: url({ path: '/api/cloud/actions' }),
          }),
        }}
      >
        {children}
      </SuperinterfaceProvider>
    </Theme>
  )
}
