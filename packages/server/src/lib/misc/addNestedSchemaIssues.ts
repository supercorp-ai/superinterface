import type { z } from 'zod'

// Parses a nested value with its own schema and reports its issues on the
// refinement context under `path`.
export const addNestedSchemaIssues = ({
  ctx,
  schema,
  value,
  path,
}: {
  ctx: z.RefinementCtx
  schema: z.ZodTypeAny
  value: unknown
  path: (string | number)[]
}) => {
  const result = schema.safeParse(value)

  if (result.success) return

  result.error.issues.forEach((issue) =>
    ctx.addIssue({
      ...issue,
      path: [...path, ...issue.path],
    }),
  )
}
