import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useState } from 'react'
import {
  SuperinterfaceProvider,
} from '@superinterface/react'
import { AssistantProvider } from './AssistantProvider'
import './styles.css'

type Args = {
  children: React.ReactNode
}

export const Providers = ({
  children,
}: Args) => {
  const superinterfaceContext = (window as any).superinterface

  if (!superinterfaceContext) {
    throw new Error('window.superinterface is not set up. Please read Superinterface integration docs.')
  }

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
      variables={{
        publicApiKey: superinterfaceContext.publicApiKey,
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
