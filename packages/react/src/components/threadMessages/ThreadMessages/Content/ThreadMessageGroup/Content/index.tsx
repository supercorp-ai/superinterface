import { Flex } from '@radix-ui/themes'
import { ThreadMessageGroup } from '@/types'
import { ThreadMessage } from '@/components/ThreadMessages/ThreadMessage'

type Args = {
  threadMessageGroup: ThreadMessageGroup
}

export const Content = ({
  threadMessageGroup,
}: Args) => (
  <Flex
    direction="column-reverse"
  >
    {threadMessageGroup.threadMessages.map((threadMessage) => (
      <ThreadMessage
        key={threadMessage.id}
        threadMessage={threadMessage}
      />
    ))}
  </Flex>
)
