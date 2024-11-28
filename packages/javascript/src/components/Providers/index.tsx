import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useState } from 'react'
import {
  SuperinterfaceProvider,
  AssistantProvider,
} from '@superinterface/react'
import { ThemeProvider } from './ThemeProvider'
import './styles.css'

type Args = {
  children: React.ReactNode
  superinterfaceContext: Record<string, any>
}

export const Providers = ({
  children,
  superinterfaceContext,
}: Args) => {
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
    <QueryClientProvider client={queryClient}>
      <SuperinterfaceProvider {...superinterfaceContext}>
        <ThemeProvider>
          <AssistantProvider>
            {children}
          </AssistantProvider>
        </ThemeProvider>
      </SuperinterfaceProvider>
    </QueryClientProvider>
  )
}
