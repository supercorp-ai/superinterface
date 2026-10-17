import type { NextRequest } from 'next/server'
import { updateTaskBodySchema } from '@/lib/tasks/schemas'
import { validateSchedule } from '@/lib/tasks/validateSchedule'
import { parseTaskBody } from './parseTaskBody'

export const parseTaskChanges = async ({
  request,
}: {
  request: NextRequest
}) => {
  const body = await parseTaskBody({ request, schema: updateTaskBodySchema })
  if (!body.ok) return body

  const { schedule } = body.data
  if (schedule !== undefined && !validateSchedule(schedule)) {
    return { ok: false as const, error: 'Invalid schedule' }
  }

  return { ok: true as const, changes: body.data }
}
