import OpenAI from 'openai'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const threadCreated = ({
  value,
  superinterfaceContext,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadCreated
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  if (!superinterfaceContext.threadIdCookieOptions?.set) return
  // @ts-ignore-next-line
  if (!value.data.metadata?.assistantId) return
  // @ts-ignore-next-line
  if (!value.data.metadata?.threadId) return

  superinterfaceContext.threadIdCookieOptions.set({
    // @ts-ignore-next-line
    assistantId: value.data.metadata.assistantId,
    // @ts-ignore-next-line
    threadId: value.data.metadata.threadId,
  })
}
