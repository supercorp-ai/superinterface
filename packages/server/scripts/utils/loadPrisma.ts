import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import { CliError } from './errors'

const nodeRequire = createRequire(import.meta.url)
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))

const generatePrismaClient = async () => {
  let prismaCliPath: string

  try {
    prismaCliPath = nodeRequire.resolve('prisma/build/index.js', {
      paths: [packageRoot],
    })
  } catch (error) {
    throw new CliError(
      'Unable to resolve Prisma CLI. Install `prisma` dependency.',
      {
        cause: error,
      },
    )
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [prismaCliPath, 'generate'], {
      cwd: packageRoot,
      stdio: 'inherit',
      env: process.env,
    })

    child.once('error', (error) => {
      reject(new CliError('Failed to run `prisma generate`.', { cause: error }))
    })

    child.once('exit', (code) => {
      if (typeof code === 'number' && code !== 0) {
        reject(new CliError(`prisma generate exited with code ${code}.`))
        return
      }

      resolve()
    })
  })
}

// This function replicates the logic from src/lib/prisma/index.ts
// Keep this in sync with that file's prismaClientSingleton function
const createPrismaClient = async (bustCache = false) => {
  // Dynamically import PrismaClient and PrismaNeon after generation
  let PrismaClientConstructor: typeof PrismaClient

  if (bustCache) {
    // After generation, import directly from the file path to bypass Node's module cache
    try {
      const prismaClientPath = nodeRequire.resolve('.prisma/client/index.js', {
        paths: [packageRoot],
      })
      const prismaClientUrl =
        pathToFileURL(prismaClientPath).href + `?t=${Date.now()}`
      const prismaModule = await import(prismaClientUrl)
      PrismaClientConstructor = prismaModule.PrismaClient
    } catch {
      // Fallback to package import
      const prismaModule = await import('@prisma/client')
      PrismaClientConstructor = prismaModule.PrismaClient
    }
  } else {
    const prismaModule = await import('@prisma/client')
    PrismaClientConstructor = prismaModule.PrismaClient
  }

  const { PrismaNeon } = await import('@prisma/adapter-neon')
  const PrismaNeonConstructor = PrismaNeon

  const connectionString = `${process.env.DATABASE_URL}`

  if (process.env.NODE_ENV === 'test') {
    return new PrismaClientConstructor()
  }

  const adapter = new PrismaNeonConstructor({
    connectionString,
  })

  return new PrismaClientConstructor({
    adapter,
    transactionOptions: {
      timeout: 15000,
    },
  })
}

export const loadPrismaClient = async (): Promise<PrismaClient> => {
  try {
    // Try to create a Prisma client with the same config as lib/prisma
    return await createPrismaClient(false)
  } catch (error) {
    // If it fails (likely because Prisma client isn't generated), generate it and try again
    if (
      error instanceof Error &&
      /Prisma Client|prisma generate/i.test(error.message)
    ) {
      await generatePrismaClient()
      return await createPrismaClient(true) // Bust the cache after generation
    }

    throw new CliError('Failed to initialize Prisma client.', { cause: error })
  }
}
