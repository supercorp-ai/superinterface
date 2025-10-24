import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const createTestWorkspace = async (
  args: Omit<Prisma.WorkspaceCreateArgs, 'data'> & {
    data?: Partial<Prisma.WorkspaceCreateArgs['data']>
  } = {},
) => {
  const { data: overrideData, ...rest } = args
  return prisma.workspace.create({
    ...rest,
    data: {
      id: randomUUID(),
      name: 'Test Workspace',
      ...(overrideData ?? {}),
    },
  })
}
