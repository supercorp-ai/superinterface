import {
  Card,
  Inset,
  Flex,
} from '@radix-ui/themes'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'
import { Thread } from '@/components/threads/Thread'

type Args = {
  children: React.ReactNode
}

const Root = ({
  children,
}: Args) => {
  const { isOpen } = useThreadDialogContext()
  if (!isOpen) return null

  return (
    <Card
      mb="3"
      style={{
        display: 'flex',
        flexGrow: 1,
        width: '100vw',
        maxWidth: '400px',
        maxHeight: '720px',
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
