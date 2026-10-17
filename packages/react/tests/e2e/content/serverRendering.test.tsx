// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@radix-ui/themes'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { Thread } from '@/components/threads/Thread'

describe('server rendering', () => {
  it('renders a thread without a window', () => {
    expect(typeof window).toBe('undefined')

    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <Theme>
          <SuperinterfaceProvider
            variables={{ publicApiKey: 'public', assistantId: 'assistant' }}
          >
            <Thread />
          </SuperinterfaceProvider>
        </Theme>
      </QueryClientProvider>,
    )

    expect(html).toContain('placeholder="Message Assistant..."')
    // Messages load in the browser, so a skeleton shows meanwhile.
    expect(html).toContain('rt-Skeleton')
  })
})
