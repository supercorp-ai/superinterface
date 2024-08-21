'use client'
import { useState } from 'react'
import {
  SuperinterfaceProvider,
  Thread,
  AssistantNameContext,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { MarkdownProvider } from './MarkdownProvider'

export default function Page() {
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
      <Theme
        accentColor="blue"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '37245be8-902a-440e-aaae-c56151fe8acc',
            assistantId: 'ef53a933-9a75-4fdb-891d-92c8a5dd509f',
          }}
        >
          <AssistantNameContext.Provider value="Next Example Videos Assistant">
            <MarkdownProvider>
              <Thread />
            </MarkdownProvider>
          </AssistantNameContext.Provider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
