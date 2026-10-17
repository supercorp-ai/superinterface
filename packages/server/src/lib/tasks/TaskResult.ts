import type { Task } from '@prisma/client'

export type TaskResult = { ok: true; task: Task } | { ok: false; error: string }
