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
  example: string
}

export const Example = ({
  example,
}: Args) => {
  const {
    createMessage,
  } = useCreateMessage()

  const { isRunActive } = useIsRunActive()

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
