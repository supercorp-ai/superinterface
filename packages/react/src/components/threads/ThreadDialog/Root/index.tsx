import { Provider } from '@/components/threads/ThreadDialog/Provider'

type Args = {
  children: React.ReactNode
}

export const Root = ({
  children,
}: Args) => (
  <Provider>
    {children}
  </Provider>
)
