'use client'

import { useState, useEffect } from 'react'
import {
  SuperinterfaceProvider,
  Thread,
  AssistantNameContext,
  useCreateMessage,
} from '@superinterface/react'
import { Theme, Button, Flex } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const ExampleButton = () => {
  const { createMessage } = useCreateMessage()

  return (
    <Button
      onClick={() => {
        createMessage({
          content: 'Hi',
        })
      }}
    >
      Hi
    </Button>
  )
}

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

  useEffect(() => {
    window.getCurrentTime = () => (
      new Date().toLocaleTimeString()
    )
  }, [])

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
            assistantId: '704a880a-cb7b-48c6-be78-cd47ec406d9e',
          }}
        >
          <AssistantNameContext.Provider value="Annotations tester">
            <Flex
              height="100dvh"
            >
              <ExampleButton />
              <Thread />
            </Flex>
          </AssistantNameContext.Provider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
