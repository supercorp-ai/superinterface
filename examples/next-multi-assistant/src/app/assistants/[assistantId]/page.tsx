'use client'

import {
  SuperinterfaceProvider,
  AssistantNameContext,
  AssistantAvatarContext,
  useAssistant,
  Avatar,
  Thread,
} from '@superinterface/react'
import { Flex, Spinner } from '@radix-ui/themes'
import { MarkdownProvider } from './MarkdownProvider'

export default function Page({
  params: { assistantId },
}: {
  params: {
    assistantId: string
  }
}) {
  const { assistant } = useAssistant({
    assistantId,
  })

  if (!assistant) {
    return (
      <Flex
        flexGrow="1"
        align="center"
        justify="center"
      >
        <Spinner size="3" />
      </Flex>
    )
  }

  return (
    <SuperinterfaceProvider
      variables={{
        assistantId: assistant.id,
      }}
    >
      <AssistantNameContext.Provider value={assistant.name}>
        <AssistantAvatarContext.Provider
          value={<Avatar avatar={assistant.avatar} />}
        >
          <Thread.Root>
            <MarkdownProvider>
              <Thread.Messages
                style={{
                  padding: 'var(--space-5)',
                }}
              />
            </MarkdownProvider>

            <Flex
              direction="column"
              pl="5"
              pr="5"
              pb="5"
              flexShrink="0"
            >
              <Thread.MessageForm />
            </Flex>
          </Thread.Root>
        </AssistantAvatarContext.Provider>
      </AssistantNameContext.Provider>
    </SuperinterfaceProvider>
  )
}
