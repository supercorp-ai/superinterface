import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  SuperinterfaceProvider,
} from '@superinterface/react'
import { ThemeProvider } from './ThemeProvider'

type Args = {
  children: React.ReactNode
}

const queryClient = new QueryClient()

export const Providers = ({
  children,
}: Args) => {
  const superinterfaceContext = (window as any).superinterface

  return (
    <SuperinterfaceProvider
      baseUrl={superinterfaceContext.baseUrl ?? 'https://superinterface.ai/api/cloud'}
      publicApiKey={superinterfaceContext.publicApiKey}
      variables={{
        assistantId: superinterfaceContext.assistantId,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SuperinterfaceProvider>
  )
}
