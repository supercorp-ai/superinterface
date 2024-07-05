import { Root } from '@/components/threads/ThreadDialog/Root'
import { Trigger } from '@/components/threads/ThreadDialog/Trigger'
import { Content } from '@/components/threads/ThreadDialog/Content'

export const ThreadDialog = () => (
  <Root>
    <Content />
    <Trigger />
  </Root>
)

ThreadDialog.Root = Root
ThreadDialog.Trigger = Trigger
ThreadDialog.Content = Content
