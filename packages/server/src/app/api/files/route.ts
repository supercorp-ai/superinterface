import { prisma } from '@/lib/prisma'
import { buildOPTIONS, buildPOST } from './buildRoute'

export const POST = buildPOST({ prisma })

export const OPTIONS = buildOPTIONS()
