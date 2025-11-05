import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

type SupportedDatabaseAdapter = 'neon' | 'direct'

const resolveDatabaseAdapter = (): SupportedDatabaseAdapter => {
  const adapter = (process.env.DATABASE_ADAPTER ?? 'neon').toLowerCase().trim()

  if (['direct', 'standard', 'postgres', 'supabase'].includes(adapter)) {
    return 'direct'
  }

  if (['neon', 'vercel', 'vercel_postgres'].includes(adapter)) {
    return 'neon'
  }

  return 'neon'
}

const prismaClientSingleton = () => {
  const connectionString = `${process.env.DATABASE_URL}`
  const databaseAdapter = resolveDatabaseAdapter()

  if (process.env.NODE_ENV === 'test') {
    return new PrismaClient()
  }

  if (databaseAdapter === 'neon') {
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

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
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
