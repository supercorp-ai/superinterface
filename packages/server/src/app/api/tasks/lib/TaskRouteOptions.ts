import type { PrismaClient } from '@prisma/client'
import type { TaskScheduler } from '@/lib/tasks/schedulers/types'

export type TaskRouteOptions = {
  prisma: PrismaClient
  scheduler?: TaskScheduler
  callbackUrl?: string
}
