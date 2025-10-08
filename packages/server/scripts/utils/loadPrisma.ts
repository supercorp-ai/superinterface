import type { PrismaClient } from '@prisma/client'
import { CliError } from './errors'

const prismaModuleCandidates = [
  '../../dist/lib/prisma/index.js',
  '../../src/lib/prisma',
] as const

type PrismaModule = {
  prisma?: PrismaClient
}

const isModuleNotFoundError = (error: unknown, modulePath: string) => {
  if (!(error instanceof Error)) return false

  const err = error as NodeJS.ErrnoException & { code?: string }
  if (
    err.code &&
    err.code !== 'MODULE_NOT_FOUND' &&
    err.code !== 'ERR_MODULE_NOT_FOUND'
  ) {
    return false
  }

  const resolvedPath = new URL(modulePath, import.meta.url).pathname
  return (
    err.message?.includes(modulePath) ||
    err.message?.includes(resolvedPath) ||
    false
  )
}

export const loadPrismaClient = async (): Promise<PrismaClient> => {
  let lastError: unknown

  for (const candidate of prismaModuleCandidates) {
    try {
      const module = (await import(candidate)) as PrismaModule
      if (module?.prisma) {
        return module.prisma
      }

      lastError = new CliError(
        `Module "${candidate}" does not export a prisma client.`,
      )
    } catch (error) {
      if (isModuleNotFoundError(error, candidate)) {
        lastError = error
        continue
      }

      throw new CliError('Failed to load Prisma client.', { cause: error })
    }
  }

  throw new CliError(
    'Prisma client module not found. Run `prisma generate` (after `npm run build:lib`) before using this command.',
    { cause: lastError },
  )
}
