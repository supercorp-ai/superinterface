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
        assistantId: 'cfb7e582-3c57-4e4d-b691-98ebcd421ec8',
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
