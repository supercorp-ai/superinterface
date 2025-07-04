'use client'

import { SuperinterfaceProvider, Thread } from '@superinterface/react'
import { Theme, Flex } from '@radix-ui/themes'
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
        accentColor="gray"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          baseUrl="http://localhost:3000/api"
          variables={{
            assistantId: process.env.NEXT_PUBLIC_ASSISTANT_ID,
          }}
        >
          <Flex
            flexGrow="1"
            height="100dvh"
            p="5"
          >
            <Thread />
          </Flex>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
