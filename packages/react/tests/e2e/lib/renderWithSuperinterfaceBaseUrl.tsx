import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { AssistantProvider } from '@/components/assistants/AssistantProvider'

// Like renderWithSuperinterface, but against any `baseUrl` (e.g. a fake that
// adds routes in front of the test server).
export const renderWithSuperinterfaceBaseUrl = ({
  children,
  baseUrl,
  variables,
}: {
  children: React.ReactNode
  baseUrl: string
  variables: Record<string, unknown>
}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <SuperinterfaceProvider
            baseUrl={baseUrl}
            variables={variables}
          >
            <AssistantProvider>{children}</AssistantProvider>
          </SuperinterfaceProvider>
        </Theme>
      </QueryClientProvider>,
    ),
  }
}
