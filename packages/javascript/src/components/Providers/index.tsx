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
  return (
    <SuperinterfaceProvider
      baseUrl={window.superinterface?.BASE_URL ?? 'https://superinterface.ai/api/cloud'}
      publicApiKey={window.superinterface?.PUBLIC_API_KEY}
      variables={{
        assistantId: window.superinterface?.ASSISTANT_ID,
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
