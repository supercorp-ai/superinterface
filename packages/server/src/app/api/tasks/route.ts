import { prisma } from '@/lib/prisma'
import { buildGET, buildOPTIONS, buildPOST } from './buildRoute'

export const GET = buildGET({ prisma })

export const POST = buildPOST({ prisma })

export const OPTIONS = buildOPTIONS()
