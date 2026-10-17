import OpenAI from 'openai'
import type { ClientToolHandler } from '@prisma/client'
import { enqueueJson } from '@superinterface/react/utils'
import type { FunctionArguments } from '../parseFunctionArguments'

// Asks the client to run the tool by streaming a requires_action event with
// the handler's arguments overridden by the model's.
export const requestClientToolCall = ({
  clientToolHandler,
  args,
  toolCall,
  controller,
  run,
}: {
  clientToolHandler: ClientToolHandler
  args: FunctionArguments
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
}) => {
  enqueueJson({
    controller,
    value: {
      event: 'thread.run.requires_action',
      data: {
        ...run,
        required_action: {
          type: 'submit_client_tool_outputs',
          submit_client_tool_outputs: {
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: clientToolHandler.name,
                  arguments: JSON.stringify({
                    ...clientToolHandler.arguments,
                    ...args,
                  }),
                },
              },
            ],
          },
        },
      },
    },
  })
}
