import { type Prisma, type PrismaClient } from '@prisma/client'
import { waitUntil } from '@vercel/functions'

export const createLog = ({
  log,
  prisma,
}: {
  log: Prisma.LogUncheckedCreateInput
  prisma: PrismaClient
}) =>
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
