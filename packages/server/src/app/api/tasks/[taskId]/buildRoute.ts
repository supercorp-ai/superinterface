import type { PrismaClient } from '@prisma/client'
import { NextResponse, type NextRequest } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { defaultScheduler } from '@/lib/tasks/schedulers/defaultScheduler'
import type { TaskRouteProps } from '../lib/authorizeTaskRequest'
import { deleteRequestTask } from '../lib/deleteRequestTask'
import { findRequestTask } from '../lib/findRequestTask'
import { taskResultResponse } from '../lib/taskResultResponse'
import type { TaskRouteOptions } from '../lib/TaskRouteOptions'
import { updateRequestTask } from '../lib/updateRequestTask'

export const buildGET =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (_request: NextRequest, props: TaskRouteProps) =>
    taskResultResponse({ result: await findRequestTask({ prisma, props }) })

export const buildPATCH =
  ({ prisma, scheduler = defaultScheduler, callbackUrl }: TaskRouteOptions) =>
  async (request: NextRequest, props: TaskRouteProps) =>
    taskResultResponse({
      result: await updateRequestTask({
        prisma,
        scheduler,
        callbackUrl,
        request,
        props,
      }),
    })

export const buildDELETE =
  ({
    prisma,
    scheduler = defaultScheduler,
  }: Omit<TaskRouteOptions, 'callbackUrl'>) =>
  async (_request: NextRequest, props: TaskRouteProps) =>
    taskResultResponse({
      result: await deleteRequestTask({ prisma, scheduler, props }),
    })

export const buildOPTIONS = () => () =>
  NextResponse.json(
    {},
    {
      headers: cacheHeaders,
    },
  )
