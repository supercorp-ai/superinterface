import { Flex } from '@radix-ui/themes'
import { MessageGroup } from '@/types'
import { Message } from '@/components/threads/Thread/Message'

type Args = {
  messageGroup: MessageGroup
}

export const Messages = ({
  messageGroup,
}: Args) => (
  <Flex
    direction="column-reverse"
  >
    {messageGroup.messages.map((message) => (
      <Message
        key={message.id}
        message={message}
      />
    ))}
  </Flex>
)
