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
      baseUrl="http://localhost:3000/api/cloud"
      variables={{
        assistantId: '8a8f7bec-3f51-498e-98d0-98db7697d889',
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
