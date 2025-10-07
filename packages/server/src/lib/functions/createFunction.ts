import type { Assistant, Prisma } from '@prisma/client'
import type { HandlerInput } from '@/types'
import { prisma } from '@/lib/prisma'
import { handlerPrismaInput } from '@/lib/handlers/handlerPrismaInput'

export async function createFunction<
  TInclude extends Prisma.FunctionInclude,
>(params: {
  assistant: Assistant
  parsedInput: { openapiSpec: string; handler: HandlerInput }
  include: TInclude // ← required
}): Promise<Prisma.FunctionGetPayload<{ include: TInclude }>> {
  const { assistant, parsedInput, include } = params

  return prisma.function.create({
    data: {
      openapiSpec: JSON.parse(parsedInput.openapiSpec),
      assistantId: assistant.id,
      handler: {
        create: {
          type: parsedInput.handler.type,
          ...(await handlerPrismaInput({
            parsedInput,
            action: 'create',
            assistant,
          })),
        },
      },
    },
    include,
  })
}
