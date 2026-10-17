import { NextResponse, type NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { apiKeyResponse } from './apiKeyResponse'
import type { PublicApiKeyWhere } from './PublicApiKeyWhere'
import { withPublicApiKey } from './withPublicApiKey'

const renameSchema = z.object({ name: z.string().min(1) })

// Renames the public api key to the name from the JSON body.
export const renameApiKeyResponse = async ({
  prisma,
  request,
  where,
}: {
  prisma: PrismaClient
  request: NextRequest
  where: PublicApiKeyWhere
}) => {
  const parsed = renameSchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'No name found' }, { status: 400 })
  }

  return withPublicApiKey({
    prisma,
    where,
    respond: async () =>
      apiKeyResponse({
        apiKey: await prisma.apiKey.update({
          where: { id: where.id },
          data: { name: parsed.data.name },
        }),
      }),
  })
}
