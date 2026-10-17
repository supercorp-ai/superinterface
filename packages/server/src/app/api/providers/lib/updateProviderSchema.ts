import { ModelProviderType } from '@prisma/client'
import { z } from 'zod'
import { createProviderSchema } from './createProviderSchema'

// The create fields, all optional: only the given ones change.
export const updateProviderSchema = createProviderSchema.extend({
  type: z.nativeEnum(ModelProviderType).optional(),
})
