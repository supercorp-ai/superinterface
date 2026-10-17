import { HandlerType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Creates an assistant function exposed to the model as `name`, together with
// its handler (e.g. `{ createTaskHandler: { create: { keyTemplate } } }`).
export const createTestHandlerFunction = async ({
  assistantId,
  name,
  type,
  handler = {},
  parameters = { type: 'object', properties: {} },
}: {
  assistantId: string
  name: string
  type: HandlerType
  handler?: Omit<Prisma.HandlerCreateWithoutFunctionInput, 'type'>
  parameters?: Record<string, unknown>
}) =>
  prisma.function.create({
    data: {
      assistantId,
      openapiSpec: {
        name,
        description: `Test function ${name}`,
        parameters,
      },
      handler: {
        create: {
          type,
          ...handler,
        },
      },
    },
  })
