import type { NextRequest } from 'next/server'
import { createTaskSchema } from '@/lib/tasks/schemas'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { parseTaskBody } from './parseTaskBody'

export const parseNewTask = async ({ request }: { request: NextRequest }) => {
  const body = await parseTaskBody({ request, schema: createTaskSchema })
  if (!body.ok) return body

  const { title, message, schedule, threadId, key = '' } = body.data
  if (!validateSchedule(schedule)) {
    return { ok: false as const, error: 'Invalid schedule' }
  }

  return {
    ok: true as const,
    newTask: { title, message, schedule, threadId, key },
  }
}
