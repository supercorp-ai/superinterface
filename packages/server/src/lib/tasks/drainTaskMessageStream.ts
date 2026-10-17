import type { createMessageResponse } from '@superinterface/react/server'
import { rejectClientToolCalls } from '@/lib/tasks/rejectClientToolCalls'

export const drainTaskMessageStream = async ({
  messageResponse,
}: {
  messageResponse: ReturnType<typeof createMessageResponse>
}) => {
  const decoder = new TextDecoder()
  const reader = messageResponse.getReader()

  while (true) {
    const { value, done } = await reader.read()
    if (done) return

    // Each chunk is one complete JSON event.
    await rejectClientToolCalls({
      event: JSON.parse(decoder.decode(value)),
    })
  }
}
