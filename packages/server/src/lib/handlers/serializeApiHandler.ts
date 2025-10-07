import { Prisma, HandlerType } from '@prisma/client'

export const serializeApiHandler = ({
  handler,
}: {
  handler: Prisma.HandlerGetPayload<{
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
  }>
}) => ({
  type: handler.type,
  ...(handler.type === HandlerType.REQUEST
    ? {
        requestHandler: {
          url: handler.requestHandler!.url,
          method: handler.requestHandler!.method,
          headers: handler.requestHandler!.headers,
          body: handler.requestHandler!.body,
        },
      }
    : {}),
  ...(handler.type === HandlerType.FIRECRAWL
    ? {
        firecrawlHandler: {
          type: handler.firecrawlHandler!.type,
          apiKey: handler.firecrawlHandler!.apiKey,
          body: handler.firecrawlHandler!.body,
        },
      }
    : {}),
  ...(handler.type === HandlerType.REPLICATE
    ? {
        replicateHandler: {
          type: handler.replicateHandler!.type,
          apiKey: handler.replicateHandler!.apiKey,
          identifier: handler.replicateHandler!.identifier,
          body: handler.replicateHandler!.body,
        },
      }
    : {}),
  ...(handler.type === HandlerType.CLIENT_TOOL
    ? {
        clientToolHandler: {
          type: handler.clientToolHandler!.type,
          name: handler.clientToolHandler!.name,
          arguments: handler.clientToolHandler!.arguments,
        },
      }
    : {}),
  ...(handler.type === HandlerType.ASSISTANT
    ? {
        assistantHandler: {
          assistantId: handler.assistantHandler!.assistantId,
        },
      }
    : {}),
  ...(handler.type === HandlerType.LIST_TASKS
    ? {
        listTasksHandler: {
          keyTemplate: handler.listTasksHandler!.keyTemplate,
        },
      }
    : {}),
  ...(handler.type === HandlerType.CREATE_TASK
    ? {
        createTaskHandler: {
          keyTemplate: handler.createTaskHandler!.keyTemplate,
        },
      }
    : {}),
  ...(handler.type === HandlerType.UPDATE_TASK
    ? {
        updateTaskHandler: {
          keyTemplate: handler.updateTaskHandler!.keyTemplate,
        },
      }
    : {}),
  ...(handler.type === HandlerType.DELETE_TASK
    ? {
        deleteTaskHandler: {
          keyTemplate: handler.deleteTaskHandler!.keyTemplate,
        },
      }
    : {}),
})
