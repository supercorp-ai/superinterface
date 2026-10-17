import { z } from 'zod'
import { TransportType } from '@prisma/client'
import { jsonStringSchema } from '@/lib/misc/jsonStringSchema'
import { addNestedSchemaIssues } from '@/lib/misc/addNestedSchemaIssues'

// SSE and HTTP transports take the same settings.
const urlTransportSchema = z.object({
  url: z.string().min(1).url(),
  headers: jsonStringSchema,
})

// STDIO servers run a local command, which the API does not allow.
const isStdioTransport = (transportType: TransportType) =>
  transportType === TransportType.STDIO

const optionalNonEmptyString = z.string().min(1).optional().nullable()

export const baseSchema = z.object({
  name: optionalNonEmptyString,
  description: optionalNonEmptyString,
  transportType: z
    .nativeEnum(TransportType)
    .refine((t) => !isStdioTransport(t), {
      message: `transportType cannot be ${TransportType.STDIO}`,
    }),
  sseTransport: urlTransportSchema.nullable().optional(),
  httpTransport: urlTransportSchema.nullable().optional(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const superRefine = (values: any, ctx: any) => {
  // baseSchema strips stdioTransport, so a STDIO payload can only be rejected.
  if (isStdioTransport(values.transportType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Transport type ${TransportType.STDIO} is not allowed.`,
    })

    return
  }

  // superRefine only runs once transportType is a valid enum value, so the
  // remaining transport types are SSE and HTTP.
  const key =
    values.transportType === TransportType.SSE
      ? 'sseTransport'
      : 'httpTransport'

  addNestedSchemaIssues({
    ctx,
    schema: urlTransportSchema,
    value: values[key],
    path: [key],
  })
}

export const mcpServerSchema = baseSchema.superRefine(superRefine)
