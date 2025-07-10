'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  SuperinterfaceProvider,
  Thread,
  AssistantProvider,
  ComponentsProvider,
  MessageGroup as SuperinterfaceMessageGroup,
  useCreateMessage,
} from '@superinterface/react'
import type { MessageGroup as MessageGroupType } from '@superinterface/react/types'
import { Theme, Flex, Button, Container } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    },
  },
})

const CreateHiddenMessageButton = () => {
  const { isPending, createMessage } = useCreateMessage()

  const onClick = useCallback(() => {
    createMessage({
      content: '<Hidden>Tell me a joke about hidden things.</Hidden>',
    })
  }, [createMessage])

  return (
    <Button
      onClick={onClick}
      loading={isPending}
    >
      Create a hidden message
    </Button>
  )
}

const MessageGroup = ({ messageGroup }: { messageGroup: MessageGroupType }) => {
  const isHidden = useMemo(
    () =>
      messageGroup.messages.some((message) =>
        (message.content ?? []).some((content) => {
          if (content.type !== 'text') return false

          return content.text.value.includes('<Hidden>')
        }),
      ),
    [messageGroup],
  )

  if (isHidden) {
    return null
  }

  if (messageGroup.role === 'assistant') {
    return (
      <Flex
        justify="center"
        pb="4"
      >
        <Container
          size="2"
          flexShrink="1"
        >
          <Flex
            p="2"
            style={{
              backgroundColor: 'var(--gray-10)',
              borderRadius: 'var(--radius-5)',
              color: 'var(--gray-1)',
              marginRight: 'calc(var(--space-9) * 2)',
            }}
          >
            <SuperinterfaceMessageGroup.Messages messageGroup={messageGroup} />
          </Flex>
        </Container>
      </Flex>
    )
  } else if (messageGroup.role === 'user') {
    return (
      <Flex
        justify="center"
        pb="4"
      >
        <Container
          size="2"
          flexShrink="1"
        >
          <Flex
            p="2"
            style={{
              backgroundColor: 'var(--blue-11)',
              borderRadius: 'var(--radius-5)',
              color: 'var(--gray-1)',
              marginLeft: 'calc(var(--space-9) * 2)',
            }}
          >
            <SuperinterfaceMessageGroup.Messages messageGroup={messageGroup} />
          </Flex>
        </Container>
      </Flex>
    )
  }
}

export default function Page() {
  const [threadId, setThreadId] = useState<string | null>(null)

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
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: '124200a9-23e6-4114-b0ce-b001a368a931',
          }}
          threadIdStorageOptions={{
            get: () => threadId,
            set: ({ threadId: newThreadId }) => setThreadId(newThreadId),
            remove: () => setThreadId(null),
          }}
        >
          <ComponentsProvider
            components={{
              MessageGroup,
            }}
          >
            <AssistantProvider>
              <Flex
                flexGrow="1"
                height="100dvh"
                p="5"
              >
                <Thread.Root>
                  <Thread.Messages />
                  <Thread.MessageForm.Root>
                    <Thread.MessageForm.Field.Root>
                      <Thread.MessageForm.Field.Control />
                      <Thread.MessageForm.Submit.Root
                        style={{
                          gap: 'var(--space-2)',
                        }}
                      >
                        <CreateHiddenMessageButton />
                        <Thread.MessageForm.Submit.Button />
                      </Thread.MessageForm.Submit.Root>
                    </Thread.MessageForm.Field.Root>
                  </Thread.MessageForm.Root>
                </Thread.Root>
              </Flex>
            </AssistantProvider>
          </ComponentsProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
