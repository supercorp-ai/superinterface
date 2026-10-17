import type { PrismaClient } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { invalidPayloadResponse } from '@/lib/misc/invalidPayloadResponse'
import { providerResponse } from '@/lib/modelProviders/providerResponse'
import type { ProviderWhere } from './ProviderWhere'
import { updateProviderSchema } from './updateProviderSchema'
import { withProvider } from './withProvider'

// Applies the JSON body changes to the provider. `where` comes from
// authorizeProviderRequest, so only providers of the private api key's
// workspace are found.
export const updateProviderResponse = async ({
  prisma,
  request,
  where,
}: {
  prisma: PrismaClient
  request: NextRequest
  where: ProviderWhere
}) => {
  const parsed = updateProviderSchema.safeParse(await request.json())

  if (!parsed.success) {
    return invalidPayloadResponse()
  }

  return withProvider({
    prisma,
    where,
    respond: async () =>
      providerResponse({
        provider: await prisma.modelProvider.update({
          where: { id: where.id },
          data: parsed.data,
        }),
      }),
  })
}
