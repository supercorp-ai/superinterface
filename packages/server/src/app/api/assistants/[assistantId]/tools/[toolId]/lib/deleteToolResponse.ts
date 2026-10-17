import type { Prisma, PrismaClient } from '@prisma/client'
import { toolInclude } from '@/lib/tools/serializeApiTool'
import { toolResponse } from '@/lib/tools/toolResponse'
import { noToolFoundResponse } from '@/lib/tools/noToolFoundResponse'

// `where` comes from authorizeToolRequest, so only tools of the api key's
// workspace are found and deleted.
export const deleteToolResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: Prisma.ToolWhereInput
}) => {
  const tool = await prisma.tool.findFirst({ where })

  if (!tool) {
    return noToolFoundResponse()
  }

  const deletedTool = await prisma.tool.delete({
    where: { id: tool.id },
    include: toolInclude,
  })

  return toolResponse({ tool: deletedTool })
}
