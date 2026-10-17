import type { ApiKey, PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import type { PublicApiKeyWhere } from './PublicApiKeyWhere'

// Responds with the scoped public api key, or with the not found error when
// the authorized workspace has no such public key.
export const withPublicApiKey = async ({
  prisma,
  where,
  respond,
}: {
  prisma: PrismaClient
  where: PublicApiKeyWhere
  respond: (apiKey: ApiKey) => Promise<NextResponse> | NextResponse
}) => {
  const apiKey = await prisma.apiKey.findFirst({ where })

  if (!apiKey) {
    return NextResponse.json({ error: 'No api key found' }, { status: 400 })
  }

  return respond(apiKey)
}
