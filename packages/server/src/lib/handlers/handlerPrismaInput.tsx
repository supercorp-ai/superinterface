import { HandlerType, type PrismaClient } from '@prisma/client'
import type { Assistant } from '@prisma/client'
import type { HandlerInput } from '@/types'
import { ValidationError } from '@/lib/errors'

// functionSchema guarantees the handler matching `type` is present, so the
// non-null assertions below are safe for every validated input.
export const handlerPrismaInput = async ({
  parsedInput,
  action,
  assistant,
  prisma,
}: {
  parsedInput: {
    handler: HandlerInput
  }
  action: 'create' | 'update'
  assistant: Assistant
  prisma: PrismaClient
}) => {
  const { handler } = parsedInput

  if (handler.type === HandlerType.REQUEST) {
    const requestHandler = handler.requestHandler!

    return {
      requestHandler: {
        [action]: {
          method: requestHandler.method,
          url: requestHandler.url,
          headers: JSON.parse(requestHandler.headers),
          body: JSON.parse(requestHandler.body),
        },
      },
    }
  }

  if (handler.type === HandlerType.FIRECRAWL) {
    const firecrawlHandler = handler.firecrawlHandler!

    return {
      firecrawlHandler: {
        [action]: {
          type: firecrawlHandler.type,
          apiKey: firecrawlHandler.apiKey,
          body: JSON.parse(firecrawlHandler.body),
        },
      },
    }
  }

  if (handler.type === HandlerType.ASSISTANT) {
    const handlerAssistant = await prisma.assistant.findFirst({
      where: {
        id: handler.assistantHandler!.assistantId,
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
  }

  if (handler.type === HandlerType.REPLICATE) {
    const replicateHandler = handler.replicateHandler!

    return {
      replicateHandler: {
        [action]: {
          type: replicateHandler.type,
          apiKey: replicateHandler.apiKey,
          identifier: replicateHandler.identifier,
          body: JSON.parse(replicateHandler.body),
        },
      },
    }
  }

  if (handler.type === HandlerType.CLIENT_TOOL) {
    const clientToolHandler = handler.clientToolHandler!

    return {
      clientToolHandler: {
        [action]: {
          type: clientToolHandler.type,
          name: clientToolHandler.name,
          arguments: JSON.parse(clientToolHandler.arguments),
        },
      },
    }
  }

  if (handler.type === HandlerType.CREATE_TASK) {
    return {
      createTaskHandler: {
        [action]: { keyTemplate: handler.createTaskHandler!.keyTemplate },
      },
    }
  }

  if (handler.type === HandlerType.LIST_TASKS) {
    return {
      listTasksHandler: {
        [action]: { keyTemplate: handler.listTasksHandler!.keyTemplate },
      },
    }
  }

  if (handler.type === HandlerType.UPDATE_TASK) {
    return {
      updateTaskHandler: {
        [action]: { keyTemplate: handler.updateTaskHandler!.keyTemplate },
      },
    }
  }

  // Every other HandlerType is handled above, so this is DELETE_TASK.
  return {
    deleteTaskHandler: {
      [action]: { keyTemplate: handler.deleteTaskHandler!.keyTemplate },
    },
  }
}
