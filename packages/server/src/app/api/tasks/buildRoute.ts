import type { PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { defaultScheduler } from '@/lib/tasks/schedulers/defaultScheduler'
import { authorizeTasksRequest } from './lib/authorizeTasksRequest'
import { createRequestTask } from './lib/createRequestTask'
import { findWorkspaceTasks } from './lib/findWorkspaceTasks'
import { taskErrorResponse } from './lib/taskErrorResponse'
import { taskResultResponse } from './lib/taskResultResponse'
import type { TaskRouteOptions } from './lib/TaskRouteOptions'
import { tasksResponse } from './lib/tasksResponse'

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest) => {
    const authorized = await authorizeTasksRequest({ prisma })
    if (!authorized.ok) return taskErrorResponse(authorized)

    const tasks = await findWorkspaceTasks({
      prisma,
      workspaceId: authorized.workspaceId,
      key: request.nextUrl.searchParams.get('key'),
    })

    return tasksResponse({ tasks })
  }

export const buildPOST =
  ({ prisma, scheduler = defaultScheduler, callbackUrl }: TaskRouteOptions) =>
  async (request: NextRequest) =>
    taskResultResponse({
      result: await createRequestTask({
        prisma,
        scheduler,
        callbackUrl,
        request,
      }),
    })

export const buildOPTIONS = () => () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
