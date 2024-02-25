import {
  Flex,
} from '@radix-ui/themes'
import { Provider } from '@/components/threads/ThreadDialog/Provider'

type Args = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export const Root = ({
  children,
  style = {},
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
        ...style,
      }}
    >
      {children}
    </Flex>
  </Provider>
)
