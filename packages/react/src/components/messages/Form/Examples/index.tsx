import {
  UseMutationOptions,
  UseInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/react-query'
import {
  Grid,
} from '@radix-ui/themes'
import { Message, MessagesPage, RunsPage } from '@/types'
import { Example } from './Example'

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  createMessageMutationOptions: UseMutationOptions<{ message: Message }>
  latestMessage: Message | null
  isLoading: boolean
}

const initialExamples = [
  'Find a brandable domain for an AI cooking app.',
  'Create a domain name for a todo app.',
  'Suggest a domain for a financial tech startup.',
  'Luxurious .com domain for a space company.',
]

const regularExamples = [
  'Continue',
]

export const Examples = ({
  createMessageMutationOptions,
  messagesQueryOptions,
  runsQueryOptions,
  latestMessage,
  isLoading,
}: Args) => {
  if (!latestMessage) {
    return (
      <Grid
        columns={{
          initial: "1",
          md: "2",
        }}
        gap="2"
        py="2"
      >
        {initialExamples.map((example) => (
          <Example
            key={example}
            example={example}
            createMessageMutationOptions={createMessageMutationOptions}
            messagesQueryOptions={messagesQueryOptions}
            runsQueryOptions={runsQueryOptions}
          />
        ))}
      </Grid>
    )
  }

  if (latestMessage.role === 'assistant' && !isLoading) {
    return (
      <Grid
        columns={{
          initial: "3",
          md: "4",
        }}
        gap="2"
        py="2"
      >
        {regularExamples.map((example) => (
          <Example
            key={example}
            example={example}
            createMessageMutationOptions={createMessageMutationOptions}
            messagesQueryOptions={messagesQueryOptions}
            runsQueryOptions={runsQueryOptions}
          />
        ))}
      </Grid>
    )
  }

  return null
}
