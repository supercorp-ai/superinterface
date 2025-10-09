import { prisma } from '@/lib/prisma'
import { buildGET, buildOPTIONS, buildPOST, maxDuration } from './buildRoute'

export { maxDuration }

export const GET = buildGET({ prisma })

export const POST = buildPOST({ prisma })

export const OPTIONS = buildOPTIONS()
