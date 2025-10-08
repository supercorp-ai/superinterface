import { spawn } from 'node:child_process'
import process from 'node:process'
import { CliError } from '../../utils/errors'
import { ensureEnv, ensureDatabaseUrl } from '../../utils/env'

export type PrismaDeployOptions = {
  schema?: string
}

export const prismaDeploy = async ({ schema }: PrismaDeployOptions = {}) => {
  await ensureEnv()
  ensureDatabaseUrl()

  await new Promise<void>((resolve, reject) => {
    const args = ['prisma', 'migrate', 'deploy']

    if (schema) {
      args.push('--schema', schema)
    }

    const child = spawn('npx', args, {
      stdio: 'inherit',
      env: process.env,
      shell: true,
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
