'use client'

import {
  SuperinterfaceProvider,
  AudioThreadDialog,
  AssistantProvider,
  WebrtcAudioRuntimeProvider,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
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
        accentColor="purple"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: 'd62bb0d7-a2a8-4b5a-b7a1-53d642504122',
          }}
        >
          <AssistantProvider>
            <WebrtcAudioRuntimeProvider>
              <AudioThreadDialog />
            </WebrtcAudioRuntimeProvider>
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
