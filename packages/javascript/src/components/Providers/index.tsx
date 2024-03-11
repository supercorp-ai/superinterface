import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useState } from 'react'
import {
  SuperinterfaceProvider,
} from '@superinterface/react'
import { AssistantProvider } from './AssistantProvider'

type Args = {
  children: React.ReactNode
}

export const Providers = ({
  children,
}: Args) => {
  const superinterfaceContext = (window as any).superinterface

  const [queryClient] = useState(() => (
    new QueryClient({
      defaultOptions: {
        queries: {
          // With SSR, we usually want to set some default staleTime
          // above 0 to avoid refetching immediately on the client
          staleTime: 10000,
        },
      },
    })
  ))

  return (
    <SuperinterfaceProvider
      baseUrl={superinterfaceContext.baseUrl ?? 'https://superinterface.ai/api/cloud'}
      publicApiKey={superinterfaceContext.publicApiKey}
      variables={{
        assistantId: superinterfaceContext.assistantId,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AssistantProvider>
          {children}
        </AssistantProvider>
      </QueryClientProvider>
    </SuperinterfaceProvider>
  )
}
