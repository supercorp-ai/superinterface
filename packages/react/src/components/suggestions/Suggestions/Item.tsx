import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Text,
  Button,
  Spinner,
} from '@radix-ui/themes'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { useToasts } from '@/hooks/toasts/useToasts'
import { createMessageDefaultOnError } from '@/lib/errors/createMessageDefaultOnError'
import type { StyleProps } from '@/types'

export const Item = ({
  suggestion,
  isDisabled,
  className,
  style,
}: {
  suggestion: string
  isDisabled: boolean
} & StyleProps) => {
  const { addToast } = useToasts()
  const queryClient = useQueryClient()
  const threadContext = useThreadContext()

  const { createMessage, isPending } = useCreateMessage({
    onError: createMessageDefaultOnError({
      queryClient,
      addToast,
      threadContext,
    }),
  })

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
      className={className}
      style={style}
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
  className,
  style,
}: {
  onClick: () => void
  isDisabled: boolean
  isPending: boolean
  children: React.ReactNode
} & StyleProps) => (
  <Button
    className={className}
    variant="soft"
    onClick={onClick}
    disabled={isDisabled}
    style={{
      minHeight: 'var(--base-button-height)',
      height: 'inherit',
      flexShrink: 1,
      ...(style ?? {}),
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
