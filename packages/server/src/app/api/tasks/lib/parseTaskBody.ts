import type { NextRequest } from 'next/server'
import type { z } from 'zod'

export const parseTaskBody = async <Schema extends z.ZodTypeAny>({
  request,
  schema,
}: {
  request: NextRequest
  schema: Schema
}) => {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return { ok: false as const, error: 'Invalid payload' }

  return { ok: true as const, data: parsed.data as z.infer<Schema> }
}
