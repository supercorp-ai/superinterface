import type { Task } from '@prisma/client'
import { NextResponse } from 'next/server'
import { cacheHeaders } from '@/lib/cache/cacheHeaders'
import { serializeTask } from '@/lib/tasks/serializeTask'

export const tasksResponse = ({ tasks }: { tasks: Task[] }) =>
  NextResponse.json(
    { tasks: tasks.map((task) => serializeTask({ task })) },
    { headers: cacheHeaders },
  )
