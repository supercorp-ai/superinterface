import { describe, expect, test, vi } from 'vitest'
import { threadMessageCompleted } from './threadMessageCompleted'

describe('threadMessageCompleted', () => {
  test('updates the streamed message and invalidates the exact messages query', () => {
    const messagesQueryKey = ['messages', { threadId: 'thread_1' }]
    const previousMessage = {
      id: 'msg_1',
      role: 'assistant',
      content: [],
      runSteps: [],
    }
    const completedMessage = {
      ...previousMessage,
      content: [
        {
          type: 'text',
          text: { value: 'Done', annotations: [] },
        },
      ],
    }
    const previousData = {
      pageParams: [],
      pages: [
        {
          data: [previousMessage],
          hasNextPage: false,
          lastId: null,
        },
      ],
    }
    let updatedData: any
    const queryClient = {
      setQueryData: vi.fn((_queryKey, updater) => {
        updatedData = updater(previousData)
      }),
      invalidateQueries: vi.fn(),
    }

    threadMessageCompleted({
      value: { data: completedMessage } as any,
      queryClient: queryClient as any,
      messagesQueryKey,
    })

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      messagesQueryKey,
      expect.any(Function),
    )
    expect(updatedData.pages[0].data[0].content).toEqual(
      completedMessage.content,
    )
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: messagesQueryKey,
    })
  })
})
