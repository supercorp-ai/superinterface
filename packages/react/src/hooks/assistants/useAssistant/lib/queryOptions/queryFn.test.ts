import { afterEach, describe, expect, test, vi } from 'vitest'
import { queryFn } from './queryFn'

const fetchAssistant = ({ variables }: { variables: Record<string, any> }) =>
  queryFn({
    superinterfaceContext: {
      baseUrl: '/api',
      variables,
    } as any,
  })({
    queryKey: ['assistants', { assistantId: 'asst_1' }],
  })

describe('useAssistant queryFn', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('passes publicApiKey when present', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ assistant: { id: 'asst_1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAssistant({ variables: { publicApiKey: 'public_1' } })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assistants/asst_1?publicApiKey=public_1',
    )
  })

  test('omits publicApiKey when missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ assistant: { id: 'asst_1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAssistant({ variables: {} })

    expect(fetchMock).toHaveBeenCalledWith('/api/assistants/asst_1')
  })
})
