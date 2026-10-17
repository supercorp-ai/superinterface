import type { Prisma, PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import type { functionSchema } from '@/lib/functions/functionSchema'
import { functionInclude } from '@/lib/functions/functionInclude'
import { functionResponse } from '@/lib/functions/functionResponse'
import { noFunctionFoundResponse } from '@/lib/functions/noFunctionFoundResponse'
import { updateFunction } from '@/lib/functions/updateFunction'

// `where` comes from authorizeFunctionRequest, so only functions of the api
// key's workspace are found and updated.
export const updateFunctionResponse = async ({
  prisma,
  where,
  body,
}: {
  prisma: PrismaClient
  where: Prisma.FunctionWhereInput
  body: z.infer<typeof functionSchema>
}) => {
  const fn = await prisma.function.findFirst({
    where,
    include: {
      assistant: true,
    },
  })

  if (!fn) {
    return noFunctionFoundResponse()
  }

  const updatedFunction = await updateFunction({
    fn,
    parsedInput: body,
    include: functionInclude,
    prisma,
  })

  return functionResponse({ fn: updatedFunction })
}
