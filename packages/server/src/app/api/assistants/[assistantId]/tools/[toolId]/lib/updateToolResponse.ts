import type { Prisma, PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { toolInclude } from '@/lib/tools/serializeApiTool'
import type { updateToolSchema } from '@/lib/tools/toolSchema'
import { toolUpdateData } from '@/lib/tools/toolUpdateData'
import { toolResponse } from '@/lib/tools/toolResponse'
import { noToolFoundResponse } from '@/lib/tools/noToolFoundResponse'

// `where` comes from authorizeToolRequest, so only tools of the api key's
// workspace are found and updated.
export const updateToolResponse = async ({
  prisma,
  where,
  body,
}: {
  prisma: PrismaClient
  where: Prisma.ToolWhereInput
  body: z.infer<typeof updateToolSchema>
}) => {
  const tool = await prisma.tool.findFirst({ where })

  if (!tool) {
    return noToolFoundResponse()
  }

  const updatedTool = await prisma.tool.update({
    where: { id: tool.id },
    data: toolUpdateData({ type: tool.type, body }),
    include: toolInclude,
  })

  return toolResponse({ tool: updatedTool })
}
