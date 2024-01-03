import {
  UseMutationOptions,
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Text,
  Button,
} from '@radix-ui/themes'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { Message, MessagesPage, RunsPage } from '@/types'

type Args = {
  example: string
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  createMessageMutationOptions: UseMutationOptions<{ message: Message }>
}

export const Example = ({
  example,
  messagesQueryOptions,
  runsQueryOptions,
  createMessageMutationOptions,
}: Args) => {
  const {
    createMessage,
  } = useCreateMessage({
    createMessageMutationOptions,
  })

  const { isRunActive } = useIsRunActive({
    messagesQueryOptions,
    runsQueryOptions,
  })

  return (
    <Button
      variant="soft"
      style={{
        justifyContent: 'space-between',
      }}
      onClick={() => {
        // @ts-ignore-next-line
        createMessage({
          content: example,
        })
      }}
      disabled={isRunActive}
    >
      <Text
        size="1"
        weight="regular"
      >
        {example}
      </Text>

      <ArrowUpIcon />
    </Button>
  )
}
