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

const globalForPrisma = globalThis as {
  prisma?: ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}
