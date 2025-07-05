'use client'

import {
  SuperinterfaceProvider,
  AudioThread,
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
        accentColor="sky"
        grayColor="gray"
        appearance="dark"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: 'bb7b9ac0-19ae-4dd7-9faa-c96efe84bd5f',
          }}
        >
          <AssistantProvider>
            <Flex
              flexGrow="1"
              height="100dvh"
              p="5"
            >
              <AudioThread />
            </Flex>
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
