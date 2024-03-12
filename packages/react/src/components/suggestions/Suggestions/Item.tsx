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
    <Content
      onClick={() => {
        createMessage({
          // @ts-ignore-next-line
          content: suggestion,
        })
      }}
      isDisabled={isDisabled}
      isPending={isPending}
    >
      {suggestion}
    </Content>
  )
}

const Content = ({
  onClick,
  isDisabled,
  isPending,
  children,
}: {
  onClick: () => void
  isDisabled: boolean
  isPending: boolean
  children: React.ReactNode
}) => (
  <Button
    variant="soft"
    onClick={onClick}
    disabled={isDisabled}
    style={{
      minHeight: 'var(--base-button-height)',
      height: 'inherit',
      flexShrink: 1,
    }}
  >
    <Text
      size="1"
      weight="regular"
    >
      {children}
    </Text>

    <Spinner loading={isPending}>
      <ArrowUpIcon
        style={{
          flexShrink: 0,
        }}
      />
    </Spinner>
  </Button>
)

Item.Content = Content
