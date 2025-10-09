import { prisma } from '@/lib/prisma'
import { buildGET, buildOPTIONS, buildPUT } from './buildRoute'

export const GET = buildGET({ prisma })

export const PUT = buildPUT({ prisma })

export const OPTIONS = buildOPTIONS()
