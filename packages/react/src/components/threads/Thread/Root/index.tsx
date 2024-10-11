import { Flex } from '@radix-ui/themes'
import {
  Provider,
  Args as ThreadProviderArgs,
} from '@/components/threads/Thread/Provider'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'

export type Args = ThreadProviderArgs

export const Root = ({
  children,
  ...rest
}: Args) => (
  <ToastsProvider>
    <Provider {...rest}>
      <Flex
        direction="column"
        flexGrow="1"
      >
        {children}
      </Flex>
    </Provider>
  </ToastsProvider>
)
