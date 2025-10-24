import { prisma } from '@/lib/prisma'
import { buildGET, buildOPTIONS, buildPATCH } from './buildRoute'

export const GET = buildGET({ prisma })

export const PATCH = buildPATCH({ prisma })

export const OPTIONS = buildOPTIONS()
