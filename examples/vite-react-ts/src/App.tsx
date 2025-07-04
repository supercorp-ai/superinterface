import {
  SuperinterfaceProvider,
  Thread,
  AssistantNameContext,
} from '@superinterface/react'
import { Theme, Flex } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    },
  },
})

function App() {
  return (
    <Theme
      hasBackground={false}
      accentColor="orange"
      grayColor="gray"
      appearance="light"
      radius="medium"
      scaling="100%"
    >
      <div>Some header content</div>

      <QueryClientProvider client={queryClient}>
        <SuperinterfaceProvider
          variables={{
            publicApiKey: 'dc703d26-e6dd-4528-8a2f-2f2ea41af366',
            assistantId: '26518c2b-07e4-44a7-bc62-36b0b3922bc7',
          }}
        >
          <AssistantNameContext.Provider value="Vite Example Assistant">
            <Flex
              flexGrow="1"
              height="80dvh"
            >
              <Thread />
            </Flex>
          </AssistantNameContext.Provider>
        </SuperinterfaceProvider>
      </QueryClientProvider>

      <div>Some footer content</div>
    </Theme>
  )
}

export default App
