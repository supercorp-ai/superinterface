import { NextResponse } from 'next/server'
import {
  ApiKeyType,
  type OrganizationApiKey,
  type PrismaClient,
} from '@prisma/client'
import { z } from 'zod'
import { apiKeyResponse } from './apiKeyResponse'
import { invalidBodyResponse } from './invalidBodyResponse'

const organizationApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(ApiKeyType),
  workspaceId: z.string().min(1).optional(),
})

// Creates an api key of any type in a workspace of the organization key's
// organization. The caller resolved `organizationApiKey` from the bearer
// token, and the workspace lookup is scoped to its organization.
export const createOrganizationApiKeyResponse = async ({
  prisma,
  organizationApiKey,
  body,
}: {
  prisma: PrismaClient
  organizationApiKey: OrganizationApiKey
  body: unknown
}) => {
  const parsed = organizationApiKeySchema.safeParse(body)

  if (!parsed.success) {
    return invalidBodyResponse()
  }

  const { type, name, workspaceId } = parsed.data

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId,
      organizationId: organizationApiKey.organizationId,
    },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Invalid workspace' }, { status: 400 })
  }

  const apiKey = await prisma.apiKey.create({
    data: {
      type,
      name,
      workspaceId: workspace.id,
    },
  })

  return apiKeyResponse({ apiKey })
}
