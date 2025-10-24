import { prisma } from '@/lib/prisma'
import {
  buildGET,
  buildOPTIONS,
  buildPOST,
  createWorkspaceSchema,
} from './buildRoute'

export { createWorkspaceSchema }

export const GET = buildGET({ prisma })

export const POST = buildPOST({ prisma })

export const OPTIONS = buildOPTIONS()
