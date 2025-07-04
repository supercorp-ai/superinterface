'use client'

import { useCallback } from 'react'
import {
  SuperinterfaceProvider,
  Thread,
  AssistantProvider,
  useSuperinterfaceContext,
} from '@superinterface/react'
import { Theme, Flex, Button } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    },
  },
})

const ResetThreadButton = () => {
  const { threadIdStorageOptions, variables } = useSuperinterfaceContext()
  const resetQueryClient = useQueryClient()

  const onClick = useCallback(() => {
    threadIdStorageOptions?.remove({ assistantId: variables.assistantId })
    resetQueryClient.invalidateQueries()
  }, [threadIdStorageOptions, variables, resetQueryClient])

  return (
    <Flex
      position="absolute"
      top="5"
      right="5"
    >
      <Button onClick={onClick}>Reset thread</Button>
    </Flex>
  )
}

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme
        accentColor="amber"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: '97ee9574-5942-4bdb-95d3-072390cf7a54',
          }}
        >
          <AssistantProvider>
            <Flex
              flexGrow="1"
              height="100dvh"
              p="5"
            >
              <Thread />
              <ResetThreadButton />
            </Flex>
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
