import { HandlerType } from '@prisma/client'
import type { Assistant } from '@prisma/client'
import type { HandlerInput } from '@/types'
import { prisma } from '@/lib/prisma'
import { ValidationError } from '@/lib/errors'

export const handlerPrismaInput = async ({
  parsedInput,
  action,
  assistant,
}: {
  parsedInput: {
    handler: HandlerInput
  }
  action: 'create' | 'update'
  assistant: Assistant
}) => {
  if (parsedInput.handler.type === HandlerType.REQUEST) {
    if (!parsedInput.handler.requestHandler)
      throw new ValidationError('Request handler is required.')

    return {
      requestHandler: {
        [action]: {
          method: parsedInput.handler.requestHandler.method,
          url: parsedInput.handler.requestHandler.url,
          headers: JSON.parse(parsedInput.handler.requestHandler.headers),
          body: JSON.parse(parsedInput.handler.requestHandler.body),
        },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.FIRECRAWL) {
    if (!parsedInput.handler.firecrawlHandler)
      throw new ValidationError('Firecrawl handler is required.')

    return {
      firecrawlHandler: {
        [action]: {
          type: parsedInput.handler.firecrawlHandler.type,
          apiKey: parsedInput.handler.firecrawlHandler.apiKey,
          body: JSON.parse(parsedInput.handler.firecrawlHandler.body),
        },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.ASSISTANT) {
    if (!parsedInput.handler.assistantHandler)
      throw new ValidationError('Assistant handler is required.')

    const handlerAssistant = await prisma.assistant.findFirst({
      where: {
        id: parsedInput.handler.assistantHandler.assistantId,
        workspaceId: assistant.workspaceId,
      },
    })

    if (!handlerAssistant) throw new ValidationError('Assistant not found.')

    return {
      assistantHandler: {
        [action]: {
          assistantId: handlerAssistant.id,
        },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.REPLICATE) {
    if (!parsedInput.handler.replicateHandler)
      throw new ValidationError('Replicate handler is required.')

    return {
      replicateHandler: {
        [action]: {
          type: parsedInput.handler.replicateHandler.type,
          apiKey: parsedInput.handler.replicateHandler.apiKey,
          identifier: parsedInput.handler.replicateHandler.identifier,
          body: JSON.parse(parsedInput.handler.replicateHandler.body),
        },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.CLIENT_TOOL) {
    if (!parsedInput.handler.clientToolHandler)
      throw new ValidationError('Client tool handler is required.')

    return {
      clientToolHandler: {
        [action]: {
          type: parsedInput.handler.clientToolHandler.type,
          name: parsedInput.handler.clientToolHandler.name,
          arguments: JSON.parse(
            parsedInput.handler.clientToolHandler.arguments,
          ),
        },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.CREATE_TASK) {
    if (!parsedInput.handler.createTaskHandler)
      throw new ValidationError('Task handler is required.')

    const keyTemplate = parsedInput.handler.createTaskHandler.keyTemplate

    return {
      createTaskHandler: {
        [action]: { keyTemplate },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.LIST_TASKS) {
    if (!parsedInput.handler.listTasksHandler)
      throw new ValidationError('Task handler is required.')

    const keyTemplate = parsedInput.handler.listTasksHandler.keyTemplate

    return {
      listTasksHandler: {
        [action]: { keyTemplate },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.UPDATE_TASK) {
    if (!parsedInput.handler.updateTaskHandler)
      throw new ValidationError('Task handler is required.')

    const keyTemplate = parsedInput.handler.updateTaskHandler.keyTemplate

    return {
      updateTaskHandler: {
        [action]: { keyTemplate },
      },
    }
  } else if (parsedInput.handler.type === HandlerType.DELETE_TASK) {
    if (!parsedInput.handler.deleteTaskHandler)
      throw new ValidationError('Task handler is required.')

    const keyTemplate = parsedInput.handler.deleteTaskHandler.keyTemplate

    return {
      deleteTaskHandler: {
        [action]: { keyTemplate },
      },
    }
  } else {
    throw new ValidationError('Handler type not supported.')
  }
}
