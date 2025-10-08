import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import { CliError } from './errors'

const prismaModuleCandidates = [
  '../../dist/lib/prisma/index.js',
  '../../src/lib/prisma',
] as const

type PrismaModule = {
  prisma?: PrismaClient
}

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const schemaPath = fileURLToPath(
  new URL('../../prisma/schema.prisma', import.meta.url),
)
const nodeRequire = createRequire(import.meta.url)

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

const isPrismaClientNotGeneratedError = (error: unknown) => {
  if (!(error instanceof Error)) return false
  return /prisma\s+client\s+did\s+not\s+initialize|Please\s+run\s+"prisma\s+generate"/i.test(
    error.message,
  )
}

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
    const child = spawn(
      process.execPath,
      [prismaCliPath, 'generate', '--schema', schemaPath],
      {
        cwd: packageRoot,
        stdio: 'inherit',
        env: process.env,
      },
    )

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

export const loadPrismaClient = async (): Promise<PrismaClient> => {
  let lastError: unknown
  let attemptedGenerate = false

  for (let index = 0; index < prismaModuleCandidates.length; index += 1) {
    const candidate = prismaModuleCandidates[index]
    try {
      const module = (await import(candidate)) as PrismaModule
      if (module?.prisma) {
        return module.prisma
      }

      lastError = new CliError(
        `Module "${candidate}" does not export a prisma client.`,
      )
    } catch (error) {
      if (isPrismaClientNotGeneratedError(error)) {
        if (attemptedGenerate) {
          throw new CliError('Prisma client failed to initialize.', {
            cause: error,
          })
        }

        await generatePrismaClient()
        attemptedGenerate = true
        index -= 1
        continue
      }

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
