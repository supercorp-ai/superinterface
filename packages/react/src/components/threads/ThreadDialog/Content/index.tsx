import {
  Card,
  Inset,
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'
import { Thread } from '@/components/threads/Thread'
import { Close } from '@/components/threads/ThreadDialog/Close'
import type { StyleProps } from '@/types'

type Args = {
  children: React.ReactNode
} & StyleProps

const Root = ({
  children,
  className,
  style,
}: Args) => {
  const { isOpen } = useThreadDialogContext()
  if (!isOpen) return null

  return (
    <Flex
      className={className}
      direction="column"
      justify="end"
      position="fixed"
      bottom={{
        initial: '0',
        sm: '72px',
      }}
      right={{
        initial: '0',
        sm: '24px',
      }}
      maxHeight={{
        initial: undefined,
        sm: '720px',
      }}
      maxWidth={{
        initial: undefined,
        sm: '400px',
      }}
      width="100%"
      height={{
        initial: '100%',
        sm: 'calc(100% - 96px)',
      }}
      style={{
        zIndex: 9999999999,
        ...style,
      }}
    >
      <Card
        mb={{
          initial: undefined,
          sm: '3',
        }}
        style={{
          position: 'relative',
          display: 'flex',
          flexGrow: 1,
        }}
      >
        <Inset
          clip="padding-box"
          side="all"
          pb="current"
          style={{
            display: 'flex',
            flexGrow: 1,
          }}
        >
          {children}
        </Inset>
        <Close />
      </Card>
    </Flex>
  )
}

const Messages = ({
  className,
  style,
}: StyleProps) => (
  <Thread.Messages
    className={className}
    style={{
      paddingTop: 'var(--space-5)',
      paddingRight: 'var(--space-5)',
      paddingLeft: 'var(--space-5)',
      ...style,
    }}
  />
)

const FormContainer = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
} & StyleProps) => (
  <Flex
    direction="column"
    pl="5"
    pr="5"
    pb="3"
    flexShrink="0"
    className={className}
    style={style}
  >
    {children}
  </Flex>
)

export const Content = (props: StyleProps) => (
  <Root {...props}>
    <Thread.Root>
      <Messages />
      <FormContainer>
        <Thread.MessageForm />
      </FormContainer>
    </Thread.Root>
  </Root>
)

Content.Root = Root
Content.Messages = Messages
Content.FormContainer = FormContainer
