import { Flex } from '@radix-ui/themes'
import {
  Provider,
  Args as ThreadProviderArgs,
} from '@/components/threads/Thread/Provider'
import type { StyleProps } from '@/types'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'

export type Args = ThreadProviderArgs & StyleProps

export const Root = ({
  children,
  style,
  className,
  ...rest
}: Args) => (
  <ToastsProvider bottom="var(--space-9)">
    <Provider {...rest}>
      <Flex
        direction="column"
        flexGrow="1"
        className={className}
        style={style}
      >
        {children}
      </Flex>
    </Provider>
  </ToastsProvider>
)
