'use client'

import { useState } from 'react'
import {
  SuperinterfaceProvider,
  Thread,
  AssistantNameContext,
} from '@superinterface/react'
import { Theme, Flex } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
        appearance="dark"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '29a25789-15d4-4f5f-a150-aa6d4e64a03b',
            assistantId: '86af5615-f570-4b26-b99d-85ef8954b809',
          }}
        >
          <Flex height="100dvh">
            <Thread />
          </Flex>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
