import OpenAI from 'openai'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const ensure = ({
  superinterfaceContext,
  variables,
  value,
}: {
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
  variables: {
    [key: string]: any
  }
  value: {
    value: OpenAI.Beta.Assistants.AssistantStreamEvent
  }
}) => {
  console.log({ value, variables, superinterfaceContext })
  if (!superinterfaceContext.threadIdCookieOptions?.set) return
  if (value.value.event !== 'thread.run.created') return
  if (variables.threadId) return
  if (!variables.assistantId) return

  console.log('saving')
  superinterfaceContext.threadIdCookieOptions.set({
    assistantId: variables.assistantId,
    threadId: value.value.data.thread_id,
  })
}
