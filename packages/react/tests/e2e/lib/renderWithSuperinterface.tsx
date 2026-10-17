import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import { inject } from 'vitest'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { AssistantProvider } from '@/components/assistants/AssistantProvider'

// Renders `children` the way an app embeds Superinterface: a query client,
// the Radix theme, and a provider pointed at the e2e test server.
export const renderWithSuperinterface = ({
  children,
  variables,
  baseUrl = inject('testServer').apiBaseUrl,
}: {
  children: React.ReactNode
  variables: Record<string, unknown>
  baseUrl?: string
}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
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
  )
}
