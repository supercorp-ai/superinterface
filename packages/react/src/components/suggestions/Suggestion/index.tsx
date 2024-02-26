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
}

export const Suggestion = ({
  suggestion,
}: Args) => {
  const { createMessage } = useCreateMessage()
  const { isRunActive } = useIsRunActive()

  return (
    <Button
      variant="soft"
      style={{
        justifyContent: 'space-between',
      }}
      onClick={() => {
        createMessage({ content: suggestion })
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
