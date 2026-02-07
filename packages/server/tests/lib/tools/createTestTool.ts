import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const createTestTool = async (args: Prisma.ToolCreateArgs) => {
  return prisma.tool.create(args)
}
