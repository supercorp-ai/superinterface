import type { StorageProviderType, ModelProviderType } from '@prisma/client'

export type ModelProviderConfig = {
  slug: string
  type: ModelProviderType
  name: string
  logoUrl: string
  iconUrl: string
  dashboardUrl: string
  description: string
  modelSlugs: string[]
  storageProviderTypes: StorageProviderType[]
  isFunctionCallingAvailable: boolean
}
