import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Creates a function on an assistant, optionally with a nested handler, e.g.
// `handler: { type: HandlerType.REQUEST, requestHandler: { create: {...} } }`.
export const createTestFunction = async ({
  assistantId,
  openapiSpec,
  handler,
}: {
  assistantId: string
  // Usually a PrismaJson.OpenapiSpec, but tests may store invalid specs.
  openapiSpec: unknown
  handler?: Prisma.HandlerCreateWithoutFunctionInput
}) =>
  prisma.function.create({
    data: {
      assistantId,
      openapiSpec: openapiSpec as PrismaJson.OpenapiSpec,
      ...(handler ? { handler: { create: handler } } : {}),
    },
  })
