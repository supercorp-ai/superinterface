'use client'

import { useState } from 'react'
import {
  SuperinterfaceProvider,
  Thread,
  AssistantNameContext,
} from '@superinterface/react'
import { Theme, Flex } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

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
        // appearance="dark"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          baseUrl="http://localhost:3001/api/cloud"
          variables={{
            publicApiKey: '29a25789-15d4-4f5f-a150-aa6d4e64a03b',
            assistantId: 'a459392c-8c18-46de-9c7c-a2b55c5a7330',
          }}
        >
          <AssistantNameContext.Provider value="Annotations tester">
            <Flex
              height="100dvh"
              pb="4"
            >
              <Thread.Root>
                <Thread.Messages />
                <Thread.MessageForm.Root>
                  <Thread.MessageForm.Field.Root>
                    <Thread.MessageForm.Field.Files.Preview />
                    <Thread.MessageForm.Field.Files.Control />
                    <Thread.MessageForm.Field.Control />
                    <Thread.MessageForm.Submit />
                  </Thread.MessageForm.Field.Root>
                </Thread.MessageForm.Root>
              </Thread.Root>

            </Flex>
          </AssistantNameContext.Provider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
