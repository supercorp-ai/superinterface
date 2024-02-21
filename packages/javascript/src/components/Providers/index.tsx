import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  SuperinterfaceProvider,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

const queryClient = new QueryClient()

export const Providers = ({
  children,
}: Args) => {
  return (
    <Theme
      accentColor="gray"
      radius="large"
    >
      <SuperinterfaceProvider
        baseUrl="http://localhost:3000/api/cloud"
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SuperinterfaceProvider>
    </Theme>
  )
}
