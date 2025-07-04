'use client'

import {
  SuperinterfaceProvider,
  Thread,
  AssistantProvider,
} from '@superinterface/react'
import { Theme, Flex } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

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
        accentColor="lime"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: '92ad4821-e7cf-49d9-bb93-89f43fb9316f',
          }}
        >
          <AssistantProvider>
            <Flex
              flexGrow="1"
              height="100dvh"
              p="5"
            >
              <Thread />
            </Flex>
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
