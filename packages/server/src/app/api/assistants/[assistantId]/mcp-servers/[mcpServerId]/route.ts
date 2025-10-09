import { prisma } from '@/lib/prisma'
import { buildDELETE, buildGET, buildOPTIONS, buildPATCH } from './buildRoute'

export const GET = buildGET({ prisma })

export const PATCH = buildPATCH({ prisma })

export const DELETE = buildDELETE({ prisma })

export const OPTIONS = buildOPTIONS()
