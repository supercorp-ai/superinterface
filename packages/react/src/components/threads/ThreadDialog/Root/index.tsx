import { Provider } from '@/components/threads/ThreadDialog/Provider'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'

type Args = {
  children: React.ReactNode
}

export const Root = ({
  children,
}: Args) => (
  <ToastsProvider>
    <Provider>
      {children}
    </Provider>
  </ToastsProvider>
)
