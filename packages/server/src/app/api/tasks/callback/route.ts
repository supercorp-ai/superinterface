import { prisma } from '@/lib/prisma'
import { buildPOST, maxDuration } from './buildRoute'

export { maxDuration }

export const POST = buildPOST({ prisma })
