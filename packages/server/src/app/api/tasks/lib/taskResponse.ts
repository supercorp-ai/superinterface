import type { Task } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeTask } from '@/lib/tasks/serializeTask'

export const taskResponse = ({ task }: { task: Task }) =>
  NextResponse.json(
    { task: serializeTask({ task }) },
    { headers: cacheHeaders },
  )
