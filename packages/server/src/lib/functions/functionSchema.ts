import {
  HandlerType,
  MethodType,
  FirecrawlHandlerType,
  ReplicateHandlerType,
  ClientToolHandlerType,
} from '@prisma/client'
import { z } from 'zod'
import { isJSON } from '@/lib/misc/isJSON'

const requestHandlerSchema = z.object({
  method: z.nativeEnum(MethodType),
  url: z.string().min(1).url(),
  headers: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
  body: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
})

const firecrawlHandlerSchema = z.object({
  type: z.nativeEnum(FirecrawlHandlerType),
  apiKey: z.string().min(1),
  body: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
})

const assistantHandlerSchema = z.object({
  assistantId: z.string().min(1),
})

const replicateHandlerSchema = z.object({
  type: z.nativeEnum(ReplicateHandlerType),
  identifier: z.string().min(1),
  apiKey: z.string().min(1),
  body: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
})

const clientToolHandlerSchema = z.object({
  type: z.nativeEnum(ClientToolHandlerType),
  name: z.string().min(1),
  arguments: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
})

const taskHandlerSchema = z.object({
  keyTemplate: z.string(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const superRefine = (values: any, ctx: any) => {
  if (values.handler.type === HandlerType.REQUEST) {
    const result = requestHandlerSchema.safeParse(values.handler.requestHandler)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'requestHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.FIRECRAWL) {
    const result = firecrawlHandlerSchema.safeParse(
      values.handler.firecrawlHandler,
    )

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'firecrawlHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.ASSISTANT) {
    const result = assistantHandlerSchema.safeParse(
      values.handler.assistantHandler,
    )

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'assistantHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.REPLICATE) {
    const result = replicateHandlerSchema.safeParse(
      values.handler.replicateHandler,
    )

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'replicateHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.CLIENT_TOOL) {
    const result = clientToolHandlerSchema.safeParse(
      values.handler.clientToolHandler,
    )

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'clientToolHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.CREATE_TASK) {
    const result = taskHandlerSchema.safeParse(values.handler.createTaskHandler)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'createTaskHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.LIST_TASKS) {
    const result = taskHandlerSchema.safeParse(values.handler.listTasksHandler)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'listTasksHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.UPDATE_TASK) {
    const result = taskHandlerSchema.safeParse(values.handler.updateTaskHandler)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'updateTaskHandler', ...issue.path],
      }),
    )
  }

  if (values.handler.type === HandlerType.DELETE_TASK) {
    const result = taskHandlerSchema.safeParse(values.handler.deleteTaskHandler)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['handler', 'deleteTaskHandler', ...issue.path],
      }),
    )
  }
}

export const baseSchema = z.object({
  openapiSpec: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
  handler: z.object({
    type: z.nativeEnum(HandlerType),
    requestHandler: requestHandlerSchema.nullable().optional(),
    firecrawlHandler: firecrawlHandlerSchema.nullable().optional(),
    assistantHandler: assistantHandlerSchema.nullable().optional(),
    replicateHandler: replicateHandlerSchema.nullable().optional(),
    clientToolHandler: clientToolHandlerSchema.nullable().optional(),
    createTaskHandler: taskHandlerSchema.nullable().optional(),
    listTasksHandler: taskHandlerSchema.nullable().optional(),
    updateTaskHandler: taskHandlerSchema.nullable().optional(),
    deleteTaskHandler: taskHandlerSchema.nullable().optional(),
  }),
})

export const functionSchema = baseSchema.superRefine(superRefine)
