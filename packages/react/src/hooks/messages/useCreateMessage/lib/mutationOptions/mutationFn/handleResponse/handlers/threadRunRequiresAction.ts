import { ToolCall } from '@/types'
import _ from 'lodash'
import type OpenAI from 'openai'
import { map } from 'radash'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const threadRunRequiresAction = async ({
  value,
  superinterfaceContext,
}: {
  value: OpenAI.Beta.Assistants.AssistantStreamEvent.ThreadRunRequiresAction & {
    data: {
      required_action: {
        type: 'submit_client_tool_outputs'
        submit_client_tool_outputs: {
          tool_calls: ToolCall[]
        }
      }
    }
  }
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>
}) => {
  // @ts-ignore-next-line
  if (value.data.required_action.type === 'submit_client_tool_outputs') {
    // @ts-ignore-next-line
    const toolCalls =
      value.data.required_action.submit_client_tool_outputs.tool_calls

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

      let output

      try {
        output = (await fn(parsedArgs)) ?? ''
      } catch (error: any) {
        output = `Error: ${error.message}`
      }

      let serializedOutput

      try {
        if (typeof output === 'string') {
          serializedOutput = output
        } else {
          serializedOutput = JSON.stringify(output)
        }
      } catch (error: any) {
        serializedOutput = `Error: ${error.message}`
      }

      return {
        toolCallId: toolCall.id,
        output: serializedOutput,
      }
    })

    return fetch(
      `${superinterfaceContext.baseUrl}/threads/runs/submit-client-tool-outputs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolOutputs,
          ...superinterfaceContext.variables,
        }),
      },
    )
  }
}
