import type { Prisma } from '@prisma/client'
import type { HandlerInput } from '@/types'
import { prisma } from '@/lib/prisma'
import { handlerPrismaInput } from '@/lib/handlers/handlerPrismaInput'

export async function updateFunction<
  TInclude extends Prisma.FunctionInclude,
>(params: {
  fn: Prisma.FunctionGetPayload<{
    include: {
      assistant: true
    }
  }>
  parsedInput: { openapiSpec: string; handler: HandlerInput }
  include: TInclude
}): Promise<Prisma.FunctionGetPayload<{ include: TInclude }>> {
  const { fn, parsedInput, include } = params

  return prisma.$transaction(async (tx) => {
    await tx.handler.deleteMany({
      where: { functionId: fn.id },
    })

    return tx.function.update({
      where: { id: fn.id },
      data: {
        openapiSpec: JSON.parse(parsedInput.openapiSpec),
        handler: {
          create: {
            type: parsedInput.handler.type,
            ...(await handlerPrismaInput({
              parsedInput,
              action: 'create',
              assistant: fn.assistant,
            })),
          },
        },
      },
      include,
    })
  })
}
