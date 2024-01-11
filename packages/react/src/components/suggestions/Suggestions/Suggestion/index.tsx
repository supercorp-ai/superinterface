import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Text,
  Button,
} from '@radix-ui/themes'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'

type Args = {
  suggestion: string
  [key: string]: any
}

export const Suggestion = ({
  suggestion,
  ...args
}: Args) => {
  const {
    createMessage,
    // @ts-ignore-next-line
  } = useCreateMessage(args)

  const { isRunActive } = useIsRunActive(args)

  return (
    <Button
      variant="soft"
      style={{
        justifyContent: 'space-between',
      }}
      onClick={() => {
        // @ts-ignore-next-line
        createMessage({
          content: suggestion,
          ...args,
        })
      }}
      disabled={isRunActive}
    >
      <Text
        size="1"
        weight="regular"
      >
        {suggestion}
      </Text>

      <ArrowUpIcon />
    </Button>
  )
}
