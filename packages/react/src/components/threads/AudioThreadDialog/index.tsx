import { AudioThread } from '@/components/threads/AudioThread'
import { Root } from '@/components/threads/ThreadDialog/Root'
import { Trigger } from '@/components/threads/ThreadDialog/Trigger'
import { Button } from '@/components/threads/ThreadDialog/Button'
import { Content } from '@/components/threads/ThreadDialog/Content'

export const AudioThreadDialog = () => (
  <Root>
    <Content.Root>
      <AudioThread />
    </Content.Root>
    <Trigger>
      <Button />
    </Trigger>
  </Root>
)

AudioThreadDialog.Root = Root
AudioThreadDialog.Trigger = Trigger
AudioThreadDialog.Button = Button
AudioThreadDialog.Content = Content
