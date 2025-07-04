'use client'

import {
  SuperinterfaceProvider,
  ThreadDialog,
  AssistantProvider,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    },
  },
})

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme
        accentColor="ruby"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: '622c9397-dfaf-43de-8fe9-0cc414e19ab7',
          }}
        >
          <AssistantProvider>
            <ThreadDialog />
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
