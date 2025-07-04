'use client'

import {
  SuperinterfaceProvider,
  Thread,
  AssistantProvider,
  MarkdownProvider,
} from '@superinterface/react'
import { Theme, Flex, Card, Avatar, Heading, Text } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    },
  },
})

const Song = ({
  title,
  artist,
}: {
  title: string
  artist: string
}) => (
  <Flex
    direction="column"
    maxWidth="400px"
    mb="3"
  >
    <Card>
      <Flex
        gap="2"
      >
        <Avatar
          src="/placeholder.png"
          fallback="A"
        />
        <Flex
          direction="column"
          gap="1"
        >
          <Heading size="2">
            {title}
          </Heading>
          <Text size="2" color="gray">
            {artist}
          </Text>
        </Flex>
      </Flex>
    </Card>
  </Flex>
)

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme
        accentColor="gray"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: 'f38c83cd-d080-4897-9fd4-9ca8637a5960',
          }}
        >
          <AssistantProvider>
            <Flex
              flexGrow="1"
              height="100dvh"
              p="5"
            >
              <MarkdownProvider
                components={{
                  Song,
                }}
              >
                <Thread />
              </MarkdownProvider>
            </Flex>
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
