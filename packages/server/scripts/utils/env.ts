import process from 'node:process'

type ProcessWithLoadEnvFile = NodeJS.Process & {
  loadEnvFile?: () => void
}

let envLoaded = false

export const ensureEnv = async () => {
  if (envLoaded) return

  const proc = process as ProcessWithLoadEnvFile

  if (typeof proc.loadEnvFile === 'function') {
    proc.loadEnvFile()
    envLoaded = true
    return
  }

  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env' })
  envLoaded = true
}

export const ensureDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is required to run this command.',
    )
  }
}
