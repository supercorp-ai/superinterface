import { ModelProviderType } from '@prisma/client'
import { z } from 'zod'

export const createProviderSchema = z.object({
  type: z.nativeEnum(ModelProviderType),
  name: z.string().optional(),
  apiKey: z.string().optional(),
  endpoint: z.string().optional().nullable(),
  apiVersion: z.string().optional().nullable(),
  azureTenantId: z.string().optional().nullable(),
  azureClientId: z.string().optional().nullable(),
  azureClientSecret: z.string().optional().nullable(),
})
