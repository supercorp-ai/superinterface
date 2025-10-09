import { prisma } from '@/lib/prisma'
import { buildGET, buildPOST, buildOPTIONS } from './buildRoute'

export const GET = buildGET({
  prisma,
})

export const POST = buildPOST({
  prisma,
})

export const OPTIONS = buildOPTIONS()
