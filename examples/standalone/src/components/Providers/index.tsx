import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import {
  SuperinterfaceProvider,
  MarkdownProvider,
  AssistantProvider,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import { components } from './components'
import './styles.css'

type Args = {
  children: React.ReactNode
}

export const Providers = ({ children }: Args) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 10000,
          },
        },
      }),
  )

  return (
    <Theme
      accentColor="blue"
      grayColor="gray"
      appearance="light"
      radius="medium"
      scaling="100%"
    >
      <SuperinterfaceProvider
        variables={{
          publicApiKey: 'dc703d26-e6dd-4528-8a2f-2f2ea41af366',
          assistantId: '87de630a-50d1-44b5-a0e4-07886f0f7c34',
        }}
      >
        <MarkdownProvider
          // @ts-ignore-next-line
          components={components}
        >
          <QueryClientProvider client={queryClient}>
            <AssistantProvider>{children}</AssistantProvider>
          </QueryClientProvider>
        </MarkdownProvider>
      </SuperinterfaceProvider>
    </Theme>
  )
}
