import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizePrivateApiKey } from '@/lib/apiKeys/authorizePrivateApiKey'
import { getAuthorizationHeader } from '@/lib/apiKeys/getAuthorizationHeader'
import { getOrganizationApiKey } from '@/lib/organizationApiKeys/getOrganizationApiKey'
import { apiKeyResponse } from './apiKeyResponse'
import { createOrganizationApiKeyResponse } from './createOrganizationApiKeyResponse'
import { invalidBodyResponse } from './invalidBodyResponse'

// Organization keys create keys of any type in their organization's
// workspaces; any other bearer token must be a private key, which creates
// public keys in its own workspace.
export const createApiKeyResponse = async ({
  prisma,
  request,
}: {
  prisma: PrismaClient
  request: Request
}) => {
  const authorization = await getAuthorizationHeader()

  if (!authorization) {
    return NextResponse.json(
      { error: 'No authorization header found' },
      { status: 400 },
    )
  }

  const body = await request.json().catch(() => null)

  const organizationApiKey = await getOrganizationApiKey({
    authorization,
    prisma,
  })

  if (organizationApiKey) {
    return createOrganizationApiKeyResponse({
      prisma,
      organizationApiKey,
      body,
    })
  }

  const { privateApiKey, errorResponse } = await authorizePrivateApiKey({
    prisma,
  })

  if (errorResponse) return errorResponse

  const parsed = z
    .object({ name: z.string().min(1).optional() })
    .safeParse(body)

  if (!parsed.success) {
    return invalidBodyResponse()
  }

  const apiKey = await prisma.apiKey.create({
    data: {
      type: ApiKeyType.PUBLIC,
      name: parsed.data.name,
      workspaceId: privateApiKey.workspaceId,
    },
  })

  return apiKeyResponse({ apiKey })
}
