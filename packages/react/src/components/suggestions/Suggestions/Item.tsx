import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Text,
  Button,
  Spinner,
} from '@radix-ui/themes'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'

export const Item = ({
  suggestion,
  isDisabled,
}: {
  suggestion: string
  isDisabled: boolean
}) => {
  const { createMessage, isPending } = useCreateMessage()

  return (
    <Button
      variant="soft"
      style={{
        justifyContent: 'space-between',
      }}
      onClick={() => {
        createMessage({
          // @ts-ignore-next-line
          content: suggestion,
        })
      }}
      disabled={isDisabled}
    >
      <Text
        size="1"
        weight="regular"
      >
        {suggestion}
      </Text>

      <Spinner loading={isPending}>
        <ArrowUpIcon />
      </Spinner>
    </Button>
  )
}
