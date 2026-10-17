import { NextResponse } from 'next/server'
import type { Prisma, PrismaClient } from '@prisma/client'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { functionInclude } from '@/lib/functions/functionInclude'
import { serializeApiFunction } from '@/lib/functions/serializeApiFunction'
import { noFunctionFoundResponse } from '@/lib/functions/noFunctionFoundResponse'

// `where` comes from authorizeFunctionRequest, so only functions of the api
// key's workspace are found and deleted.
export const deleteFunctionResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: Prisma.FunctionWhereInput
}) => {
  const fn = await prisma.function.findFirst({ where })

  if (!fn) {
    return noFunctionFoundResponse()
  }

  const deletedFunction = await prisma.function.delete({
    where: { id: fn.id },
    include: functionInclude,
  })

  // The deleted function is returned under `mcpServer`, not `function`.
  return NextResponse.json(
    {
      mcpServer: serializeApiFunction({ fn: deletedFunction }),
    },
    { headers: cacheHeaders },
  )
}
