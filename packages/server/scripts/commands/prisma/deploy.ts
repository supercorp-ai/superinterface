import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { CliError } from '../../utils/errors'
import { ensureEnv, ensureDatabaseUrl } from '../../utils/env'

export type PrismaDeployOptions = {
  schema?: string
}

const packageRoot = fileURLToPath(new URL('../../..', import.meta.url))
const defaultSchemaPath = fileURLToPath(
  new URL('../../../prisma/schema.prisma', import.meta.url),
)
const nodeRequire = createRequire(import.meta.url)

export const prismaDeploy = async ({ schema }: PrismaDeployOptions = {}) => {
  await ensureEnv()
  ensureDatabaseUrl()

  await new Promise<void>((resolve, reject) => {
    const args = ['migrate', 'deploy']
    const schemaPath = schema ?? defaultSchemaPath

    if (schemaPath) {
      args.push('--schema', schemaPath)
    }

    let prismaCliPath: string

    try {
      prismaCliPath = nodeRequire.resolve('prisma/build/index.js', {
        paths: [packageRoot],
      })
    } catch (error) {
      reject(
        new CliError(
          'Unable to resolve Prisma CLI. Install `prisma` dependency.',
          {
            cause: error,
          },
        ),
      )
      return
    }

    const child = spawn(process.execPath, [prismaCliPath, ...args], {
      cwd: packageRoot,
      stdio: 'inherit',
      env: process.env,
    })

    child.once('error', (error) => {
      reject(
        new CliError('Failed to run Prisma migrate deploy.', { cause: error }),
      )
    })

    child.once('exit', (code) => {
      if (typeof code === 'number' && code !== 0) {
        reject(new CliError(`Prisma migrate deploy exited with code ${code}.`))
        return
      }

      resolve()
    })
  })
}
