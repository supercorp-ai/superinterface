import type { ModelProvider, PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import type { ProviderWhere } from './ProviderWhere'

// Responds with the scoped provider, or with the not found error when the
// authorized workspace has no such provider.
export const withProvider = async ({
  prisma,
  where,
  respond,
}: {
  prisma: PrismaClient
  where: ProviderWhere
  respond: (provider: ModelProvider) => Promise<NextResponse> | NextResponse
}) => {
  const provider = await prisma.modelProvider.findFirst({ where })

  if (!provider) {
    return NextResponse.json({ error: 'No provider found' }, { status: 400 })
  }

  return respond(provider)
}
