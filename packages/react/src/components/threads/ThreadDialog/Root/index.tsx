import {
  Flex,
} from '@radix-ui/themes'
import { Provider } from '@/components/threads/ThreadDialog/Provider'

type Args = {
  children: React.ReactNode
}

export const Root = ({
  children,
}: Args) => (
  <Provider>
    <Flex
      direction="column"
      justify="end"
      align="end"
      position="fixed"
      style={{
        bottom: '24px',
        right: '24px',
        top: '24px',
        zIndex: 9999999999,
      }}
    >
      {children}
    </Flex>
  </Provider>
)
