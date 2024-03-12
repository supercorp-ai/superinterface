import {
  Card,
  Inset,
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'
import { Thread } from '@/components/threads/Thread'

type Args = {
  children: React.ReactNode
  style?: React.CSSProperties
}

const Root = ({
  children,
  style = {},
}: Args) => {
  const { isOpen } = useThreadDialogContext()
  if (!isOpen) return null

  return (
    <Flex
      direction="column"
      justify="end"
      position="fixed"
      style={{
        bottom: '72px',
        right: '24px',
        top: '24px',
        height: 'calc(100vh - 72px - 24px)',
        zIndex: 9999999999,
        maxHeight: '720px',
        maxWidth: '400px',
        width: '100vw',
        ...style,
      }}
    >
      <Card
        mb="3"
        style={{
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
      </Card>
    </Flex>
  )
}

export const Content = () => (
  <Root>
    <Thread.Root>
      <Thread.Messages
        style={{
          paddingTop: 'var(--space-5)',
          paddingRight: 'var(--space-5)',
          paddingLeft: 'var(--space-5)',
        }}
      />
      <Flex
        direction="column"
        pl="5"
        pr="5"
        pb="3"
        flexShrink="0"
      >
        <Thread.MessageForm />
      </Flex>
    </Thread.Root>
  </Root>
)

Content.Root = Root
