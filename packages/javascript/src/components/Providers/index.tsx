import {
  SuperinterfaceProvider,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

type QueryFnArgs = {
  queryKey: [string]
  pageParam?: string
}

const endpointQueryOptions = ({
  url,
}: {
  url: string
}) => ({
  queryKey: () => [url],
  queryFn: async ({
    pageParam,
    queryKey: queryFnQueryKey,
  }: QueryFnArgs) => {
    const params = new URLSearchParams({
      pageParam: pageParam || '',
    })

    return fetch(`${url}?${params}`).then(res => res.json())
  },
})

const endpointMutationOptions = ({
  url,
}: {
  url: string
}) => ({
  mutationFn: async (data: any) => (
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
}: Args) => (
  <Theme
    accentColor="gray"
    radius="large"
  >
    <SuperinterfaceProvider
      queryOptions={{
        // @ts-ignore-next-line
        messages: endpointQueryOptions({
          url: url({ path: '/api/messages' }),
        }),
        // @ts-ignore-next-line
        runs: endpointQueryOptions({
          url: url({ path: '/api/runs' }),
        }),
      }}
      mutationOptions={{
        createMessage: endpointMutationOptions({
          url: url({ path: '/api/messages' }),
        }),
        createRun: endpointMutationOptions({
          url: url({ path: '/api/runs' }),
        }),
        handleAction: endpointMutationOptions({
          url: url({ path: '/api/actions' }),
        }),
      }}
    >
      {children}
    </SuperinterfaceProvider>
  </Theme>
)
