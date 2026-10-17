import type { CreateWorkspace } from './CreateWorkspace'

export const createDefaultWorkspace: CreateWorkspace = ({
  parsedData,
  organization,
  prisma,
}) =>
  prisma.workspace.create({
    data: {
      name: parsedData.name ?? '',
      organizationId: organization.id,
    },
  })
