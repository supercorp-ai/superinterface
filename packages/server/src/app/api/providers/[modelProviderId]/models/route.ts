import { prisma } from '@/lib/prisma'
import { buildGET, buildOPTIONS } from './buildRoute'

export const GET = buildGET({ prisma })

export const OPTIONS = buildOPTIONS()
