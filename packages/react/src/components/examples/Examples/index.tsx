import {
  Grid,
} from '@radix-ui/themes'
import { Message } from '@/types'
import { Example } from './Example'

type Args = {
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
          />
        ))}
      </Grid>
    )
  }

  return null
}
