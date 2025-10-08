import { headers } from 'next/headers'
import { ApiKeyType, type PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { validate } from 'uuid'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { getPrisma } from '@/lib/prisma'
import { serializeTask } from '@/lib/tasks/serializeTask'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { getApiKey } from '@/lib/apiKeys/getApiKey'
import { scheduleTask } from '@/lib/tasks/scheduleTask'
import { cancelScheduledTask } from '@/lib/tasks/cancelScheduledTask'

const updateTaskSchema = z.object({
  title: z.string().optional(),
  message: z.string().optional(),
  schedule: z.any().optional(),
  key: z.string().optional(),
})

export const buildGET =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    _request: NextRequest,
    props: { params: Promise<{ taskId: string }> },
  ) => {
    const { taskId } = await props.params

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

    if (!taskId) {
      return NextResponse.json({ error: 'No task id found' }, { status: 400 })
    }

    if (!validate(taskId)) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 })
    }

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        thread: { assistant: { workspaceId: privateApiKey.workspaceId } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'No task found' }, { status: 400 })
    }

    return NextResponse.json(
      { task: serializeTask({ task }) },
      { headers: cacheHeaders },
    )
  }

export const GET = buildGET()

export const buildPATCH =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    request: NextRequest,
    props: { params: Promise<{ taskId: string }> },
  ) => {
    const { taskId } = await props.params

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

    if (!taskId) {
      return NextResponse.json({ error: 'No task id found' }, { status: 400 })
    }

    if (!validate(taskId)) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 })
    }

    const parsed = updateTaskSchema.safeParse(await request.json())

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const updateData = {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.message !== undefined
        ? { message: parsed.data.message }
        : {}),
      ...(parsed.data.schedule !== undefined
        ? {
            ...(validateSchedule(parsed.data.schedule)
              ? { schedule: parsed.data.schedule }
              : {}),
          }
        : {}),
      ...(parsed.data.key !== undefined ? { key: parsed.data.key } : {}),
    }

    if (
      parsed.data.schedule !== undefined &&
      !validateSchedule(parsed.data.schedule)
    ) {
      return NextResponse.json({ error: 'Invalid schedule' }, { status: 400 })
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        thread: { assistant: { workspaceId: privateApiKey.workspaceId } },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'No task found' }, { status: 400 })
    }

    const task = await prisma.task.update({
      where: { id: existingTask.id },
      data: updateData,
    })

    await scheduleTask({ task, prisma })

    return NextResponse.json(
      { task: serializeTask({ task }) },
      { headers: cacheHeaders },
    )
  }

export const PATCH = buildPATCH()

export const buildDELETE =
  ({ prisma = getPrisma() }: { prisma?: PrismaClient } = {}) =>
  async (
    _request: NextRequest,
    props: { params: Promise<{ taskId: string }> },
  ) => {
    const { taskId } = await props.params

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

    if (!taskId) {
      return NextResponse.json({ error: 'No task id found' }, { status: 400 })
    }

    if (!validate(taskId)) {
      return NextResponse.json({ error: 'Invalid task id' }, { status: 400 })
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        thread: { assistant: { workspaceId: privateApiKey.workspaceId } },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'No task found' }, { status: 400 })
    }

    await cancelScheduledTask({ task: existingTask })

    const task = await prisma.task.delete({ where: { id: existingTask.id } })

    return NextResponse.json(
      { task: serializeTask({ task }) },
      { headers: cacheHeaders },
    )
  }

export const DELETE = buildDELETE()

export const OPTIONS = () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
