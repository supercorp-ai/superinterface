import type { PrismaClient } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { providerResponse } from '@/lib/modelProviders/providerResponse'
import { createProviderSchema } from './createProviderSchema'
import { providerCreateData } from './providerCreateData'

// Creates a provider from the JSON body in the private api key's workspace.
export const createProviderResponse = async ({
  prisma,
  request,
  workspaceId,
}: {
  prisma: PrismaClient
  request: NextRequest
  workspaceId: string
}) => {
  const parsed = createProviderSchema.safeParse(await request.json())

  if (!parsed.success) {
    return invalidPayloadResponse()
  }

  const provider = await prisma.modelProvider.create({
    data: providerCreateData({ body: parsed.data, workspaceId }),
  })

  return providerResponse({ provider })
}
