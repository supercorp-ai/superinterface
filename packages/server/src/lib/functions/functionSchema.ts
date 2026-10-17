import {
  HandlerType,
  MethodType,
  FirecrawlHandlerType,
  ReplicateHandlerType,
  ClientToolHandlerType,
} from '@prisma/client'
import { z } from 'zod'
import { jsonStringSchema } from '@/lib/misc/jsonStringSchema'
import { addNestedSchemaIssues } from '@/lib/misc/addNestedSchemaIssues'

const requestHandlerSchema = z.object({
  method: z.nativeEnum(MethodType),
  url: z.string().min(1).url(),
  headers: jsonStringSchema,
  body: jsonStringSchema,
})

const firecrawlHandlerSchema = z.object({
  type: z.nativeEnum(FirecrawlHandlerType),
  apiKey: z.string().min(1),
  body: jsonStringSchema,
})

const assistantHandlerSchema = z.object({
  assistantId: z.string().min(1),
})

const replicateHandlerSchema = z.object({
  type: z.nativeEnum(ReplicateHandlerType),
  identifier: z.string().min(1),
  apiKey: z.string().min(1),
  body: jsonStringSchema,
})

const clientToolHandlerSchema = z.object({
  type: z.nativeEnum(ClientToolHandlerType),
  name: z.string().min(1),
  arguments: jsonStringSchema,
})

const taskHandlerSchema = z.object({
  keyTemplate: z.string(),
})

// The handler field each handler type requires, with its schema.
const requiredHandlers = [
  {
    type: HandlerType.REQUEST,
    key: 'requestHandler',
    schema: requestHandlerSchema,
  },
  {
    type: HandlerType.FIRECRAWL,
    key: 'firecrawlHandler',
    schema: firecrawlHandlerSchema,
  },
  {
    type: HandlerType.ASSISTANT,
    key: 'assistantHandler',
    schema: assistantHandlerSchema,
  },
  {
    type: HandlerType.REPLICATE,
    key: 'replicateHandler',
    schema: replicateHandlerSchema,
  },
  {
    type: HandlerType.CLIENT_TOOL,
    key: 'clientToolHandler',
    schema: clientToolHandlerSchema,
  },
  {
    type: HandlerType.CREATE_TASK,
    key: 'createTaskHandler',
    schema: taskHandlerSchema,
  },
  {
    type: HandlerType.LIST_TASKS,
    key: 'listTasksHandler',
    schema: taskHandlerSchema,
  },
  {
    type: HandlerType.UPDATE_TASK,
    key: 'updateTaskHandler',
    schema: taskHandlerSchema,
  },
  {
    type: HandlerType.DELETE_TASK,
    key: 'deleteTaskHandler',
    schema: taskHandlerSchema,
  },
] as const

// baseSchema accepts every handler field as optional; this requires the one
// matching the handler type. An invalid handler that baseSchema already
// reported is reported again here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const superRefine = (values: any, ctx: any) =>
  requiredHandlers
    .filter(({ type }) => type === values.handler.type)
    .forEach(({ key, schema }) =>
      addNestedSchemaIssues({
        ctx,
        schema,
        value: values.handler[key],
        path: ['handler', key],
      }),
    )

export const baseSchema = z.object({
  openapiSpec: jsonStringSchema,
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
