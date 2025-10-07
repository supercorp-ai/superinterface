import OpenAI from 'openai'
import type { Prisma } from '@prisma/client'
import { isObject } from 'radash'

export const getFunction = ({
  assistant,
  toolCall,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      functions: {
        include: {
          handler: {
            include: {
              requestHandler: true
              firecrawlHandler: true
              replicateHandler: true
              clientToolHandler: true
              assistantHandler: true
              createTaskHandler: true
              listTasksHandler: true
              updateTaskHandler: true
              deleteTaskHandler: true
            }
          }
        }
      }
    }
  }>
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}) => {
  const validFunctions = assistant.functions.filter((fn) => {
    if (!fn.openapiSpec) return false
    if (!isObject(fn.openapiSpec)) return false
    if (!fn.openapiSpec.name) return false

    return true
  })

  return validFunctions.find(
    (fn) => fn.openapiSpec.name === toolCall.function.name,
  )
}
