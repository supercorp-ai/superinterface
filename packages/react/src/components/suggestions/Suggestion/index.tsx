import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Text,
  Button,
} from '@radix-ui/themes'
import { useCreateThreadMessage } from '@/hooks/threadMessages/useCreateThreadMessage'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'

type Args = {
  suggestion: string
}

export const Suggestion = ({
  suggestion,
}: Args) => {
  const { createThreadMessage } = useCreateThreadMessage()
  const { isRunActive } = useIsRunActive()

  return (
    <Button
      variant="soft"
      style={{
        justifyContent: 'space-between',
      }}
      onClick={() => {
        createThreadMessage({ content: suggestion })
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
