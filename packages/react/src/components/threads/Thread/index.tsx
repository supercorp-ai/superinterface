import { Messages } from '@/components/threads/Thread/Messages'
import { MessageForm } from '@/components/threads/Thread/MessageForm'
import { Root, Args as RootArgs } from '@/components/threads/Thread/Root'

type Args = Omit<RootArgs, 'children'>

export const Thread = (props: Args) => (
  <Root {...props}>
    <Messages />
    <MessageForm />
  </Root>
)

Thread.Root = Root
Thread.Messages = Messages
Thread.MessageForm = MessageForm
