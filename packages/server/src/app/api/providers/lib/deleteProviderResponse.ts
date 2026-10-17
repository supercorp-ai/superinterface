import { NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { providerResponse } from '@/lib/modelProviders/providerResponse'
import type { ProviderWhere } from './ProviderWhere'
import { withProvider } from './withProvider'

// Deletes the provider unless an assistant of the authorized workspace uses
// it. `where` comes from authorizeProviderRequest, so only providers of the
// private api key's workspace are found.
export const deleteProviderResponse = async ({
  prisma,
  where,
}: {
  prisma: PrismaClient
  where: ProviderWhere
}) => {
  const assistantsUsingProvider = await prisma.assistant.count({
    where: { modelProviderId: where.id, workspaceId: where.workspaceId },
  })

  if (assistantsUsingProvider > 0) {
    return NextResponse.json({ error: 'Provider in use' }, { status: 400 })
  }

  return withProvider({
    prisma,
    where,
    respond: async () =>
      providerResponse({
        provider: await prisma.modelProvider.delete({
          where: { id: where.id },
        }),
      }),
  })
}
