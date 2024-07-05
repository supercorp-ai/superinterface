import { AudioThread } from '@/components/threads/AudioThread'
import { Root } from '@/components/threads/ThreadDialog/Root'
import { Trigger } from '@/components/threads/ThreadDialog/Trigger'
import { Content } from '@/components/threads/ThreadDialog/Content'

export const AudioThreadDialog = () => (
  <Root>
    <Content.Root>
      <AudioThread />
    </Content.Root>
    <Trigger />
  </Root>
)

AudioThreadDialog.Root = Root
AudioThreadDialog.Trigger = Trigger
AudioThreadDialog.Content = Content
