import { Messages } from '@/components/threads/Thread/Messages'
import { MessageForm } from '@/components/threads/Thread/MessageForm'
import { Root, Args as RootArgs } from '@/components/threads/Thread/Root'

type Args = Omit<RootArgs, 'children'>

export const Thread = (props: Args) => (
  <Root {...props}>
    <Messages
      style={{
        padding: 'var(--space-5)',
      }}
    />
    <MessageForm
      style={{
        paddingLeft: 'var(--space-5)',
        paddingRight: 'var(--space-5)',
        paddingBottom: 'var(--space-5)',
      }}
    />
  </Root>
)

Thread.Root = Root
Thread.Messages = Messages
Thread.MessageForm = MessageForm
