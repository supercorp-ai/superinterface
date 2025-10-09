import { headers } from 'next/headers'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { createTaskSchema } from '@/lib/tasks/schemas'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { scheduleTask } from '@/lib/tasks/scheduleTask'

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest) => {
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'No authorization header found' },
        { status: 400 },
      )
    }

    const privateApiKey = await getApiKey({
      authorization,
      type: ApiKeyType.PRIVATE,
      prisma,
    })

    if (!privateApiKey) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    const key = request.nextUrl.searchParams.get('key')

    const tasks = await prisma.task.findMany({
      where: {
        ...(key ? { key } : {}),
        thread: { assistant: { workspaceId: privateApiKey.workspaceId } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      {
        tasks: tasks.map((t) => serializeTask({ task: t })),
      },
      { headers: cacheHeaders },
    )
  }

export const buildPOST =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest) => {
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    if (!authorization) {
      return NextResponse.json(
        { error: 'No authorization header found' },
        { status: 400 },
      )
    }

    const privateApiKey = await getApiKey({
      authorization,
      type: ApiKeyType.PRIVATE,
      prisma,
    })

    if (!privateApiKey) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    const parsed = createTaskSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { title, message, schedule, threadId } = parsed.data

    if (!validateSchedule(schedule)) {
      return NextResponse.json({ error: 'Invalid schedule' }, { status: 400 })
    }

    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        assistant: {
          workspaceId: privateApiKey.workspaceId,
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title,
        message,
        schedule,
        thread: {
          connect: { id: thread.id },
        },
        key: parsed.data.key ?? '',
      },
    })

    await scheduleTask({ task, prisma })

    return NextResponse.json(
      {
        task: serializeTask({ task }),
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
