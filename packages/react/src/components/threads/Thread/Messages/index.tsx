import { Flex } from '@radix-ui/themes'
import { Message } from '@/components/threads/Thread/Message'
import { StyleProps } from '@/types'
import { Content } from './Content'
import { Progress } from './Progress'
import { Root } from './Root'
import { NextPageSkeleton } from './NextPageSkeleton'

type Args = {
  children?: React.ReactNode
} & StyleProps

export const Messages = ({ children, className, style }: Args) => (
  <Root
    style={style}
    className={className}
  >
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
Messages.Content = Content
