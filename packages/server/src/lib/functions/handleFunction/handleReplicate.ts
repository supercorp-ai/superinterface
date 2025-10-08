import OpenAI from 'openai'
import {
  ReplicateHandler,
  ReplicateHandlerType,
  Assistant,
  Thread,
  LogRequestMethod,
  LogRequestRoute,
  LogLevel,
  type PrismaClient,
} from '@prisma/client'
import Replicate from 'replicate'
import { createLog } from '@/lib/logs/createLog'
import { merge } from '@/lib/misc/merge'

export const handleReplicate = async ({
  replicateHandler,
  toolCall,
  assistant,
  thread,
  prisma,
}: {
  replicateHandler: ReplicateHandler
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  assistant: Assistant
  thread: Thread
  prisma: PrismaClient
}) => {
  let args

  try {
    args = JSON.parse(toolCall.function.arguments)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message: `Failed parsing Replicate function arguments: ${e.message}`,
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

  const replicate = new Replicate({
    auth: replicateHandler.apiKey,
    useFileOutput: false,
  })

  if (replicateHandler.type === ReplicateHandlerType.RUN) {
    try {
      const result = await replicate.run(
        replicateHandler.identifier as '`${string}/${string}',
        merge(replicateHandler.body, args),
      )

      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(result),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      createLog({
        log: {
          requestMethod: LogRequestMethod.POST,
          requestRoute: LogRequestRoute.MESSAGES,
          level: LogLevel.ERROR,
          status: 400,
          message: `Failed calling Replicate RUN function: ${e.message}`,
          workspaceId: assistant.workspaceId,
          assistantId: assistant.id,
          threadId: thread.id,
        },
        prisma,
      })

      return {
        tool_call_id: toolCall.id,
        output: 'Function call failed.',
      }
    }
  } else {
    createLog({
      log: {
        requestMethod: LogRequestMethod.POST,
        requestRoute: LogRequestRoute.MESSAGES,
        level: LogLevel.ERROR,
        status: 400,
        message: `Invalid Replicate handler type: ${replicateHandler.type}`,
        workspaceId: assistant.workspaceId,
        assistantId: assistant.id,
        threadId: thread.id,
      },
      prisma,
    })

    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({
        success: false,
        message: 'Invalid Replicate handler type',
      }),
    }
  }
}
