import { z } from 'zod'

const isoLoose =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2})?$/

export const recurrenceRuleSchema = z
  .object({
    frequency: z.enum([
      'yearly',
      'monthly',
      'weekly',
      'daily',
      'hourly',
      'minutely',
      'secondly',
    ]),
    interval: z.number().int().min(1).optional(),
    byDay: z.array(z.string()).optional(),
    byMonth: z.array(z.number()).optional(),
    byHour: z.array(z.number()).optional(),
    byMinute: z.array(z.number()).optional(),
    bySecond: z.array(z.number()).optional(),
    until: z.string().regex(isoLoose).optional(),
    count: z.number().int().optional(),
  })
  .passthrough()

export const scheduleSchema = z
  .object({
    start: z.string().regex(isoLoose),
    due: z.string().regex(isoLoose).optional(),
    recurrenceRules: z.array(recurrenceRuleSchema).optional(),
  })
  .passthrough()
