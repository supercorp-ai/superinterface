'use client'
import { useState } from 'react'
import { SuperinterfaceProvider, Gui } from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MarkdownProvider } from './MarkdownProvider'

export default function Page() {
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
            assistantId: '0b6883c1-b3b3-4865-9e61-926339d66e0d',
          }}
        >
          <MarkdownProvider>
            <Gui />
          </MarkdownProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
