import type { OrganizationApiKey, PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { workspaceResponse } from '@/lib/workspaces/workspaceResponse'
import type { CreateWorkspace } from './CreateWorkspace'
import { createWorkspaceSchema } from './createWorkspaceSchema'

// Creates a workspace from the JSON body in the organization key's
// organization.
export const createWorkspaceResponse = async ({
  prisma,
  createWorkspace,
  request,
  organizationApiKey,
}: {
  prisma: PrismaClient
  createWorkspace: CreateWorkspace
  request: NextRequest
  organizationApiKey: OrganizationApiKey
}) => {
  const parsed = createWorkspaceSchema.safeParse(await request.json())

  if (!parsed.success) {
    return invalidPayloadResponse()
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationApiKey.organizationId },
  })

  if (!organization) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 },
    )
  }

  const workspace = await createWorkspace({
    parsedData: parsed.data,
    organization,
    prisma,
  })

  return workspaceResponse({ workspace })
}
