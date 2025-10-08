import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const connectionString = `${process.env.DATABASE_URL}`

  if (process.env.NODE_ENV === 'test') {
    return new PrismaClient()
  }

  const adapter = new PrismaNeon({
    connectionString,
  })

  return new PrismaClient({
    adapter,
    transactionOptions: {
      timeout: 15000,
    },
  })
}

const globalKey = '__superinterfaceServerPrisma'

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
  var __superinterfaceServerPrisma: undefined | PrismaClient
}

export const getPrisma = (): PrismaClient => {
  const globalForPrisma = globalThis as typeof globalThis & {
    [globalKey]?: PrismaClient
    prisma?: PrismaClient
  }

  if (globalForPrisma[globalKey]) return globalForPrisma[globalKey]
  if (globalForPrisma.prisma) {
    globalForPrisma[globalKey] = globalForPrisma.prisma
    return globalForPrisma.prisma
  }

  const client = prismaClientSingleton()
  globalForPrisma[globalKey] = client
  if (!globalForPrisma.prisma) globalForPrisma.prisma = client
  return client
}

export const prisma = getPrisma()
