import OpenAI from 'openai'
import {
  ClientToolHandler,
  Assistant,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import { createLog } from '@/lib/logs/createLog'
import { enqueueJson } from '@superinterface/react/utils'
import { redis } from '@/lib/redis'

export const handleClientTool = async ({
  clientToolHandler,
  toolCall,
  assistant,
  thread,
  controller,
  run,
  prisma,
}: {
  clientToolHandler: ClientToolHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  controller: ReadableStreamDefaultController
  run: OpenAI.Beta.Threads.Runs.Run
  prisma: PrismaClient
}) => {
  let args = {}

  const toolCallArguments = toolCall.function.arguments

  if (toolCallArguments) {
    try {
      args = JSON.parse(toolCallArguments)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: `Failed parsing client tool function arguments: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: 'Invalid arguments.',
      }
    }
  }

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
              // toolCall,
              // {
              //   id: toolCall.id,
              //   type: 'function',
              //   function: toolCall,
              //     toolCall,
              //     output: 'Function is running',
              //   },
              // },
            ],
          },
        },
      },
    },
  })

  await redis.set(`submit-client-tool-outputs:pending:${toolCall.id}`, '1', {
    ex: 60 * 60 * 24 * 7,
  })

  const functionResult = await new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      resolve('Function call timed out')
    }, 60000)

    const checkResult = async () => {
      const result = await redis.get(
        `submit-client-tool-outputs:output:${toolCall.id}`,
      )

      if (result === null) {
        setTimeout(checkResult, 500)
      } else {
        clearTimeout(timeout)

        await redis.del(`submit-client-tool-outputs:pending:${toolCall.id}`)
        await redis.del(`submit-client-tool-outputs:output:${toolCall.id}`)
        resolve(result)
      }
    }

    checkResult()
  })

  return {
    tool_call_id: toolCall.id,
    output: functionResult,
  }
}
