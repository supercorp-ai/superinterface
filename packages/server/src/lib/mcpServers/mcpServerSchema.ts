import { z } from 'zod'
import { TransportType } from '@prisma/client'
import { isJSON } from '@/lib/misc/isJSON'

const stdioTransportSchema = z.object({
  command: z.string().min(1),
  args: z.string().min(1),
})

const sseTransportSchema = z.object({
  url: z.string().min(1).url(),
  headers: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
})

const httpTransportSchema = z.object({
  url: z.string().min(1).url(),
  headers: z.string().min(1).refine(isJSON, {
    message: 'Must be a valid JSON string.',
  }),
})

export const baseSchema = z.object({
  transportType: z
    .nativeEnum(TransportType)
    .refine((t) => t !== TransportType.STDIO, {
      message: `transportType cannot be ${TransportType.STDIO}`,
    }),
  sseTransport: sseTransportSchema.nullable().optional(),
  httpTransport: httpTransportSchema.nullable().optional(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const superRefine = (values: any, ctx: any) => {
  if (values.transportType === TransportType.STDIO) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Transport type ${TransportType.STDIO} is not allowed.`,
    })

    const result = stdioTransportSchema.safeParse(values.stdioTransport)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['stdioTransport', ...issue.path],
      }),
    )
  } else if (values.transportType === TransportType.SSE) {
    const result = sseTransportSchema.safeParse(values.sseTransport)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['sseTransport', ...issue.path],
      }),
    )
  } else if (values.transportType === TransportType.HTTP) {
    const result = httpTransportSchema.safeParse(values.httpTransport)

    if (result.success) return

    result.error.issues.forEach((issue) =>
      ctx.addIssue({
        ...issue,
        path: ['httpTransport', ...issue.path],
      }),
    )
  }
}

export const mcpServerSchema = baseSchema.superRefine(superRefine)
