import { type Prisma } from '@prisma/client'
import { waitUntil } from '@vercel/functions'
import { prisma } from '@/lib/prisma'

export const createLog = ({ log }: { log: Prisma.LogUncheckedCreateInput }) =>
  waitUntil(
    new Promise(async (resolve) => {
      console.log('Logging error.')

      await prisma.log.create({
        data: log,
      })

      console.log('Successfully logged error.')
      resolve(true)
    }),
  )
