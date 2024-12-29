'use client'

import { useState } from 'react'
import {
  SuperinterfaceProvider,
  AudioThread,
  AssistantNameContext,
  useCreateMessage,
} from '@superinterface/react'
import { Theme, Button } from '@radix-ui/themes'
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
            assistantId: '13b80702-9d30-44db-84b6-85764921f00c',
          }}
        >
          <AssistantNameContext.Provider value="Annotations tester">
            <ExampleButton />
            <AudioThread />
          </AssistantNameContext.Provider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
