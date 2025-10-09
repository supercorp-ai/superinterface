import { prisma } from '@/lib/prisma'
import { buildPOST } from './buildRoute'

export const POST = buildPOST({ prisma })
