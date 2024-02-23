import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  SuperinterfaceProvider,
} from '@superinterface/react'

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
        assistantId: 'ea811802-7914-4740-930c-fb820c6900e8',
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SuperinterfaceProvider>
  )
}
