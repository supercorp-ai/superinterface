import { Thread } from '@/components/threads/Thread'
import { Root } from '@/components/threads/ThreadDialog/Root'
import { Trigger } from '@/components/threads/ThreadDialog/Trigger'
import { Button } from '@/components/threads/ThreadDialog/Button'
import { Content } from '@/components/threads/ThreadDialog/Content'

export const ThreadDialog = () => (
  <Root>
    <Content>
      <Thread />
    </Content>
    <Trigger>
      <Button />
    </Trigger>
  </Root>
)
