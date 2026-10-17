import type { Prisma } from '@prisma/client'

export const functionInclude = {
  handler: {
    include: {
      requestHandler: true,
      firecrawlHandler: true,
      replicateHandler: true,
      clientToolHandler: true,
      assistantHandler: true,
      createTaskHandler: true,
      listTasksHandler: true,
      updateTaskHandler: true,
      deleteTaskHandler: true,
    },
  },
} satisfies Prisma.FunctionInclude
