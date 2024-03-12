import {
  Flex,
} from '@radix-ui/themes'
import { Provider } from '@/components/threads/ThreadDialog/Provider'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'

type Args = {
  children: React.ReactNode
  style?: React.CSSProperties
}

export const Root = ({
  children,
  style = {},
}: Args) => (
  <ToastsProvider>
    <Provider>
      {children}
    </Provider>
  </ToastsProvider>
)
