import { headers } from 'next/headers'
import { Prisma, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getPrisma } from '@/lib/prisma'
import { validate } from 'uuid'
import { getOrganizationApiKey } from '@/lib/organizationApiKeys/getOrganizationApiKey'
import { serializeApiWorkspace } from '@/lib/workspaces/serializeApiWorkspace'

export const buildGET =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    _request: NextRequest,
    props: {
      params: Promise<{ workspaceId: string }>
    },
  ) => {
    const { workspaceId } = await props.params

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

    if (!validate(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid workspace id' },
        { status: 400 },
      )
    }

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

export const GET = buildGET()

export const buildPATCH =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    request: NextRequest,
    props: {
      params: Promise<{ workspaceId: string }>
    },
  ) => {
    const { workspaceId } = await props.params

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

    if (!validate(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid workspace id' },
        { status: 400 },
      )
    }

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

export const PATCH = buildPATCH()

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
