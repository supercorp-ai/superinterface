import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const prismaGlobalKey = Symbol.for('superinterface.server.prisma')

type GlobalPrismaState = typeof globalThis & {
  [prismaGlobalKey]?: PrismaClient
  prisma?: PrismaClient
}

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

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const getPrisma = (): PrismaClient => {
  const globalForPrisma = globalThis as GlobalPrismaState

  if (globalForPrisma[prismaGlobalKey])
    return globalForPrisma[prismaGlobalKey] as PrismaClient
  if (globalForPrisma.prisma) {
    globalForPrisma[prismaGlobalKey] = globalForPrisma.prisma
    return globalForPrisma.prisma
  }

  const client = prismaClientSingleton()
  globalForPrisma[prismaGlobalKey] = client
  if (!globalForPrisma.prisma) globalForPrisma.prisma = client
  return client
}

const getClient = (): PrismaClient => {
  return getPrisma()
}

let prismaInstance: PrismaClient | undefined

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = prismaInstance ?? (prismaInstance = getClient())
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
  set(_target, prop, value, receiver) {
    const client = prismaInstance ?? (prismaInstance = getClient())
    return Reflect.set(client, prop, value, receiver)
  },
  has(_target, prop) {
    const client = prismaInstance ?? (prismaInstance = getClient())
    return Reflect.has(client, prop)
  },
  ownKeys() {
    const client = prismaInstance ?? (prismaInstance = getClient())
    return Reflect.ownKeys(client)
  },
  getOwnPropertyDescriptor(_target, prop) {
    const client = prismaInstance ?? (prismaInstance = getClient())
    return Reflect.getOwnPropertyDescriptor(client, prop)
  },
}) as PrismaClient
