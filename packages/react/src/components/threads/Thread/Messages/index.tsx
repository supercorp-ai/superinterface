import {
  Flex,
} from '@radix-ui/themes'
import { Content } from './Content'
import { Progress } from './Progress'
import { Root } from './Root'
import { NextPageSkeleton } from './NextPageSkeleton'
import { Message } from '@/components/threads/Thread/Message'

type Args = {
  children?: React.ReactNode
  style?: React.CSSProperties
}

export const Messages = ({
  children,
  style = {},
}: Args) => (
  <Root style={style}>
    <Flex
      flexShrink="0"
      height="var(--space-3)"
    />

    <Progress />

    {children}

    <Content />

    <NextPageSkeleton />

    <Flex
      flexShrink="0"
      flexGrow="1"
      minHeight="var(--space-5)"
    />
  </Root>
)

Messages.Root = Root
Messages.Message = Message
Messages.NextPageSkeleton = NextPageSkeleton
