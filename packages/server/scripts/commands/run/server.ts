import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { CliError } from '../../utils/errors'
import { ensureDatabaseUrl, ensureEnv } from '../../utils/env'

const supportedRuntimes = ['next'] as const

type SupportedRuntime = (typeof supportedRuntimes)[number]

export type RunServerOptions = {
  runtime?: string
  port?: number
}

const isSupportedRuntime = (runtime: string): runtime is SupportedRuntime => {
  return supportedRuntimes.includes(runtime as SupportedRuntime)
}

export const runServer = async ({
  runtime = 'next',
  port,
}: RunServerOptions) => {
  const normalizedRuntime = runtime.toLowerCase()

  if (!isSupportedRuntime(normalizedRuntime)) {
    throw new CliError(`Unsupported runtime "${runtime}".`, {
      cause: `Supported runtimes: ${supportedRuntimes.join(', ')}`,
    })
  }

  await ensureEnv()
  ensureDatabaseUrl()

  switch (normalizedRuntime) {
    case 'next':
      await runNextRuntime({ port })
      return
  }
}

type RunCommandOptions = {
  label: string
  cwd: string
  env?: NodeJS.ProcessEnv
}

const runCommand = async (
  command: string,
  args: string[],
  { label, cwd, env }: RunCommandOptions,
) => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env,
    })

    const forwardSignal = (signal: NodeJS.Signals) => {
      if (!child.killed) {
        child.kill(signal)
      }
    }

    const onSigint = () => forwardSignal('SIGINT')
    const onSigterm = () => forwardSignal('SIGTERM')

    const cleanup = () => {
      process.off('SIGINT', onSigint)
      process.off('SIGTERM', onSigterm)
    }

    process.on('SIGINT', onSigint)
    process.on('SIGTERM', onSigterm)

    child.once('error', (error) => {
      cleanup()
      reject(new CliError(`${label} failed to start.`, { cause: error }))
    })

    child.once('exit', (code, signal) => {
      cleanup()

      if (signal) {
        process.kill(process.pid, signal)
        return
      }

      if (typeof code === 'number' && code !== 0) {
        reject(new CliError(`${label} exited with code ${code}.`))
        return
      }

      resolve()
    })
  })
}

type RunNextRuntimeOptions = {
  port?: number
}

const runNextRuntime = async ({ port }: RunNextRuntimeOptions) => {
  const packageRoot = fileURLToPath(new URL('../../..', import.meta.url))
  const require = createRequire(import.meta.url)

  let nextBinPath: string
  try {
    const nextPackageJson = require.resolve('next/package.json', {
      paths: [packageRoot],
    })
    nextBinPath = path.resolve(path.dirname(nextPackageJson), 'dist/bin/next')
  } catch (error) {
    throw new CliError('Next runtime is not installed or cannot be resolved.', {
      cause: error,
    })
  }

  const environment = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'production',
  }

  const buildIdPath = path.join(packageRoot, '.next', 'BUILD_ID')
  if (!fs.existsSync(buildIdPath)) {
    throw new CliError(
      'No existing Next build found. Run `next build` before starting.',
    )
  }

  const startArgs = ['start']

  if (typeof port === 'number') {
    startArgs.push('-p', String(port))
  }

  await runCommand(process.execPath, [nextBinPath, ...startArgs], {
    label: 'Next runtime',
    cwd: packageRoot,
    env: environment,
  })
}
