import { Prisma } from '@prisma/client'
import { serializeApiHandler } from '@/lib/handlers/serializeApiHandler'

export const serializeApiFunction = ({
  fn,
}: {
  fn: Prisma.FunctionGetPayload<{
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
  }>
}) => ({
  id: fn.id,
  openapiSpec: fn.openapiSpec,
  handler: serializeApiHandler({
    handler: fn.handler!,
  }),
  createdAt: fn.createdAt.toISOString(),
  updatedAt: fn.updatedAt.toISOString(),
})
