import { z } from 'zod'
import { isJSON } from '@/lib/misc/isJSON'

export const jsonStringSchema = z.string().min(1).refine(isJSON, {
  message: 'Must be a valid JSON string.',
})
