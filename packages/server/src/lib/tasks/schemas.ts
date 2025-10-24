import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string(),
  message: z.string(),
  schedule: z.any(),
  threadId: z.string(),
  key: z.string().optional(),
})

export const createTaskToolSchema = createTaskSchema.omit({ threadId: true })

export const updateTaskSchema = z.object({
  taskId: z.string(),
  title: z.string().optional(),
  message: z.string().optional(),
  schedule: z.any().optional(),
  key: z.string().optional(),
})

export const deleteTaskSchema = z.object({
  taskId: z.string(),
})

export const listTasksSchema = z.object({})
