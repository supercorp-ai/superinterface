import { Flex } from '@radix-ui/themes'
import {
  Provider,
  Args as ThreadProviderArgs,
} from '@/components/threads/Thread/Provider'

export type Args = ThreadProviderArgs

export const Root = ({
  children,
  ...rest
}: Args) => (
  <Provider {...rest}>
    <Flex
      direction="column"
      flexGrow="1"
    >
      {children}
    </Flex>
  </Provider>
)
