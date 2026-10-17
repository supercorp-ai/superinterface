import { enqueueJson } from '@superinterface/react/utils'
import { serializeThread } from './serializeThread'
import type { CreateMessageThread } from './createMessageAssistant'

// Announces a newly created thread to the client, ahead of the run's events.
// Existing threads are not announced.
export const enqueueThreadCreated = ({
  controller,
  thread,
  isThreadCreated,
}: {
  controller: ReadableStreamDefaultController
  thread: CreateMessageThread
  isThreadCreated: boolean
}) => {
  if (!isThreadCreated) return

  return enqueueJson({
    controller,
    value: {
      event: 'thread.created',
      data: serializeThread({ thread }),
    },
  })
}
