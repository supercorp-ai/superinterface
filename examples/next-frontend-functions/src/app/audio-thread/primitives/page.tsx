'use client'

import { useState } from 'react'
import {
  SuperinterfaceProvider,
  AudioThread,
  AssistantNameContext,
  useWebrtcAudioRuntime,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const Content = () => {
  const { webrtcAudioRuntime } = useWebrtcAudioRuntime()

  return (
    <AudioThread.Root audioRuntime={webrtcAudioRuntime}>
      <AudioThread.Visualization.Root>
        <AudioThread.Visualization.AssistantVisualization.Root
          height="100px"
          width="100px"
        >
          <AudioThread.Visualization.AssistantVisualization.BarsVisualizer
            height="20px"
            barWidth="10px"
          />
        </AudioThread.Visualization.AssistantVisualization.Root>
      </AudioThread.Visualization.Root>
      <AudioThread.Status />
      <AudioThread.Form />
    </AudioThread.Root>
  )
}

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
          // baseUrl="http://localhost:3000/api/cloud"
          variables={{
            publicApiKey: '37245be8-902a-440e-aaae-c56151fe8acc',
            assistantId: '1e5e718b-d94c-4362-b4a5-8401583b958a',
          }}
        >
          <AssistantNameContext.Provider value="Realtime tester">
            <Content />
          </AssistantNameContext.Provider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
