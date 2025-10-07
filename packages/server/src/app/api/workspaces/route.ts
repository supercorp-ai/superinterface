import type { Organization, Workspace } from '@prisma/client'
import { headers } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { prisma } from '@/lib/prisma'
import { serializeApiWorkspace } from '@/lib/workspaces/serializeApiWorkspace'
import { getOrganizationApiKey } from '@/lib/organizationApiKeys/getOrganizationApiKey'

const createWorkspaceSchema = z.object({
  name: z.string().optional(),
})

export const GET = async () => {
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
  })

  if (!organizationApiKey) {
    return NextResponse.json(
      { error: 'Invalid organization api key' },
      { status: 400 },
    )
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      organizationId: organizationApiKey.organizationId,
    },
  })

  return NextResponse.json(
    {
      workspaces: workspaces.map((workspace) =>
        serializeApiWorkspace({ workspace }),
      ),
    },
    { headers: cacheHeaders },
  )
}

export const buildPOST =
  ({
    createWorkspace = ({
      parsedData,
      organization,
    }: {
      parsedData: z.infer<typeof createWorkspaceSchema>
      organization: Organization
    }) =>
      prisma.workspace.create({
        data: {
          name: parsedData.name ?? '',
          organizationId: organization.id,
        },
      }),
  }: {
    createWorkspace?: ({
      parsedData,
      organization,
    }: {
      parsedData: z.infer<typeof createWorkspaceSchema>
      organization: Organization
    }) => Promise<Workspace>
  }) =>
  async (request: NextRequest) => {
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
    })

    if (!organizationApiKey) {
      return NextResponse.json(
        { error: 'Invalid organization api key' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const parsed = createWorkspaceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const organization = await prisma.organization.findUnique({
      where: {
        id: organizationApiKey.organizationId,
      },
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
    })

    return NextResponse.json(
      {
        workspace: serializeApiWorkspace({ workspace }),
      },
      { headers: cacheHeaders },
    )
  }

export const POST = buildPOST({})

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
