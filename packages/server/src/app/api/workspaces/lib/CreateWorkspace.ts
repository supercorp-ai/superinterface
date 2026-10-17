import type { Organization, PrismaClient, Workspace } from '@prisma/client'
import type { z } from 'zod'
import type { createWorkspaceSchema } from './createWorkspaceSchema'

// Creates the workspace of a POST /api/workspaces request; injectable so
// hosts can fill in their own workspace fields.
export type CreateWorkspace = ({
  parsedData,
  organization,
  prisma,
}: {
  parsedData: z.infer<typeof createWorkspaceSchema>
  organization: Organization
  prisma: PrismaClient
}) => Promise<Workspace>
