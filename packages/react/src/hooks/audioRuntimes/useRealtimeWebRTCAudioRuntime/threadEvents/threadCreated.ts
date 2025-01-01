import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

type ThreadCreatedEvent = {
  type: 'thread.created'
  thread: {
    metadata: {
      assistantId: string
      threadId: string
    }
  }
}

export const threadCreated = ({
  event,
  superinterfaceContext,
}: {
  event: ThreadCreatedEvent
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (!superinterfaceContext.threadIdStorageOptions?.set) return
  if (!event.thread.metadata?.assistantId) return
  if (!event.thread.metadata?.threadId) return

  superinterfaceContext.threadIdStorageOptions.set({
    assistantId: event.thread.metadata.assistantId,
    threadId: event.thread.metadata.threadId,
  })
}
