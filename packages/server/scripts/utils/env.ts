import process from 'node:process'

type ProcessWithLoadEnvFile = NodeJS.Process & {
  loadEnvFile?: () => void
}

let envLoaded = false

export const ensureEnv = async () => {
  if (envLoaded) return

  const proc = process as ProcessWithLoadEnvFile
  let handled = false

  if (typeof proc.loadEnvFile === 'function') {
    try {
      proc.loadEnvFile()
      handled = true
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code
      if (code && code !== 'ENOENT') {
        throw error
      }
    }
  }

  if (!handled) {
    const dotenv = await import('dotenv')
    dotenv.config({ path: '.env' })
  }

  envLoaded = true
}

export const ensureDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is required to run this command.',
    )
  }
}
