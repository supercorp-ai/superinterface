import { prisma } from '@/lib/prisma'
import {
  buildGET,
  buildOPTIONS,
  buildPOST,
  createAssistantSchema,
} from './buildRoute'

export { createAssistantSchema }

export const GET = buildGET({ prisma })

export const POST = buildPOST({ prisma })

export const OPTIONS = buildOPTIONS()
