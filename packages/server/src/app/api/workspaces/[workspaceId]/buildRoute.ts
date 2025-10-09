import { headers } from 'next/headers'
import { Prisma, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { validate } from 'uuid'
import { getOrganizationApiKey } from '@/lib/organizationApiKeys/getOrganizationApiKey'
import { serializeApiWorkspace } from '@/lib/workspaces/serializeApiWorkspace'

type RouteProps = {
  params: Promise<{ workspaceId: string }>
}
type AuthorizedOrgResult = {
  organizationApiKey: NonNullable<
    Awaited<ReturnType<typeof getOrganizationApiKey>>
  >
}

const ensureValidWorkspaceId = (workspaceId: string) => {
  if (!validate(workspaceId)) {
    return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 })
  }

  return null
}

const authorize = async ({
  prisma,
}: {
  prisma: PrismaClient
}): Promise<AuthorizedOrgResult | NextResponse> => {
  const headersList = await headers()
  const authorization = headersList.get('authorization')

  if (!authorization) {
    return NextResponse.json(
      { error: 'No authorization header found' },
      { status: 400 },
    )
  }

  const organizationApiKey = await getOrganizationApiKey({
    authorization,
    prisma,
  })

  if (!organizationApiKey) {
    return NextResponse.json(
      { error: 'Invalid organization api key' },
      { status: 400 },
    )
  }

  return { organizationApiKey }
}

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: RouteProps) => {
    const { workspaceId } = await props.params

    const authorized = await authorize({ prisma })
    if (authorized instanceof NextResponse) return authorized
    const { organizationApiKey } = authorized

    const validationError = ensureValidWorkspaceId(workspaceId)
    if (validationError) return validationError

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId: organizationApiKey.organizationId,
      },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    return NextResponse.json(
      {
        workspace: serializeApiWorkspace({ workspace }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPATCH =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest, props: RouteProps) => {
    const { workspaceId } = await props.params

    const authorized = await authorize({ prisma })
    if (authorized instanceof NextResponse) return authorized
    const { organizationApiKey } = authorized

    const validationError = ensureValidWorkspaceId(workspaceId)
    if (validationError) return validationError

    const body = await request.json()
    const schema = z.object({
      name: z.string().optional(),
    })

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { name } = parsed.data
    const updateData: Prisma.WorkspaceUpdateInput = {
      ...(name !== undefined ? { name } : {}),
    }

    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        organizationId: organizationApiKey.organizationId,
      },
    })

    if (!existingWorkspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
    })

    return NextResponse.json(
      {
        workspace: serializeApiWorkspace({ workspace }),
      },
      { headers: cacheHeaders },
    )
  }

export const buildOPTIONS = () => () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
