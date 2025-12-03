'use client'

import {
  SuperinterfaceProvider,
  Thread,
  AssistantProvider,
} from '@superinterface/react'
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
        accentColor="lime"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: 'e6709062-c641-44d0-a9e5-9e1da1099907',
            assistantId: '816b577b-bd8d-4d1c-8ff2-93a45055c242',
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
