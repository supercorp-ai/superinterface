'use client'

import { useState } from 'react'
import {
  SuperinterfaceProvider,
  AudioThread,
  AssistantNameContext,
  useRealtimeWebRTCAudioRuntime,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const Content = () => {
  const { realtimeWebRTCAudioRuntime } = useRealtimeWebRTCAudioRuntime()

  return (
    <AudioThread
      audioRuntime={realtimeWebRTCAudioRuntime}
    />
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
          baseUrl="http://localhost:3000/api/cloud"
          variables={{
            publicApiKey: '37245be8-902a-440e-aaae-c56151fe8acc',
            assistantId: '13b80702-9d30-44db-84b6-85764921f00c',
          }}
        >
          <AssistantNameContext.Provider value="Annotations tester">
            <Content />
          </AssistantNameContext.Provider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
