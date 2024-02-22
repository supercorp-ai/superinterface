import { Flex } from '@radix-ui/themes'
import { ThreadMessages } from '@/components/threadMessages/ThreadMessages'
import { ThreadMessageForm } from '@/components/threadMessages/ThreadMessageForm'
import {
  ThreadProvider,
  Args as ThreadProviderArgs,
} from '@/components/threads/ThreadProvider'

type Args = ThreadProviderArgs

export const Thread = (props: Args) => (
  <ThreadProvider {...props}>
    <Flex
      direction="column"
      grow="1"
    >
      <ThreadMessages />
      <ThreadMessageForm />
    </Flex>
  </ThreadProvider>
)
