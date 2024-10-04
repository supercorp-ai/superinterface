import OpenAI from 'openai'
import { map } from 'radash'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { MessagesQueryKey, ToolCall } from '@/types'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { handlers } from './handlers'

export const handleResponse = ({
  value,
  messagesQueryKey,
  queryClient,
  superinterfaceContext,
}: {
  value: {
    value: OpenAI.Beta.Assistants.AssistantStreamEvent
  }
  messagesQueryKey: MessagesQueryKey
  queryClient: ReturnType<typeof useQueryClient>
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  const finalHandlers = {
    ...handlers,
    ...{
      'thread.run.requires_action': async ({
        value
      }: any) => {
        if (value.data.required_action.type === 'submit_client_tool_outputs') {
          const toolCalls = value.data.required_action.submit_client_tool_outputs.tool_calls

          const toolOutputs = await map(toolCalls, async (toolCall: ToolCall) => {
            if (toolCall.type !== 'function') {
              return {
                toolCallId: toolCall.id,
                output: `Error: client tool type ${toolCall.type} is not supported.`,
              }
            }

            // @ts-ignore-next-line
            const fn = window[toolCall.function.name as string]

            if (!fn) {
              return {
                toolCallId: toolCall.id,
                output: `Error: client function ${toolCall.function.name} is not defined.`,
              }
            }

            const args = toolCall.function.arguments
            const parsedArgs = JSON.parse(args)

            const output = await fn(parsedArgs)

            return {
              toolCallId: toolCall.id,
              output,
            }
          })

          return fetch(`${superinterfaceContext.baseUrl}/threads/runs/submit-client-tool-outputs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              toolOutputs,
              ...superinterfaceContext.variables,
            })
          })
        }
      },
    }
  }
  // @ts-ignore-next-line
  const handler = finalHandlers[value.value.event]

  if (!handler) {
    return console.log('Missing handler', { value })
  }

  return handler({
    value: value.value,
    queryClient,
    messagesQueryKey,
    superinterfaceContext,
  })
}
