// Starts the real server for client e2e tests (e.g. @superinterface/react,
// @superinterface/javascript): a fresh Postgres database, migrations, an
// organization API key, and `next dev` on a free port. Prints one line
// `SUPERINTERFACE_TEST_SERVER {json}` once ready, and drops the database
// when stopped (SIGTERM/SIGINT).
import { execSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const READY_MARKER = 'SUPERINTERFACE_TEST_SERVER'

// Compiling a route on first request takes seconds; warm the ones clients use.
const WARM_ROUTES = [
  '/api/messages',
  '/api/files',
  '/api/threads/runs/submit-client-tool-outputs',
  `/api/assistants/${randomUUID()}`,
  `/api/files/${randomUUID()}/contents`,
  '/api/workspaces',
  '/api/api-keys',
  '/api/providers',
  '/api/assistants',
]

const serverDir = path.resolve(import.meta.dirname, '../..')

const freePort = () =>
  new Promise<number>((resolve) => {
    const server = createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })

const postgres = ({ command }: { command: string }) =>
  execSync(command, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: 'postgres' },
  })

const seedOrganizationApiKey = async ({
  databaseUrl,
}: {
  databaseUrl: string
}) => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  const organization = await prisma.organization.create({
    data: { name: 'E2E Organization' },
  })
  const organizationApiKey = await prisma.organizationApiKey.create({
    data: { name: 'E2E', organizationId: organization.id },
  })
  await prisma.$disconnect()

  return organizationApiKey.value
}

const waitForRoutes = async ({ baseUrl }: { baseUrl: string }) => {
  const deadline = Date.now() + 120_000

  for (const route of WARM_ROUTES) {
    while (true) {
      const response = await fetch(`${baseUrl}${route}`, {
        method: 'OPTIONS',
      }).catch(() => null)
      if (response?.ok) break
      if (Date.now() > deadline) throw new Error(`Timed out warming ${route}`)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
}

const main = async () => {
  const databaseName = `superinterface_test_${randomUUID()}`
  const databaseUrl = `postgresql://postgres:postgres@localhost:5432/${databaseName}`
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    DATABASE_ADAPTER: 'direct',
  }

  postgres({ command: `createdb -h localhost -U postgres ${databaseName}` })

  const dropDatabase = () =>
    postgres({
      command: `dropdb -h localhost -U postgres --if-exists --force ${databaseName}`,
    })

  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    stdio: 'ignore',
    env,
  })

  const organizationApiKey = await seedOrganizationApiKey({ databaseUrl })
  const port = await freePort()
  const baseUrl = `http://127.0.0.1:${port}`

  const next = spawn('npx', ['next', 'dev', '--turbopack', '-p', `${port}`], {
    cwd: serverDir,
    env,
    detached: true,
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  const stop = () => {
    try {
      process.kill(-next.pid!, 'SIGTERM')
    } catch {
      // Already stopped.
    }
    dropDatabase()
    process.exit(0)
  }

  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)

  await waitForRoutes({ baseUrl })

  console.log(
    `${READY_MARKER} ${JSON.stringify({
      baseUrl,
      apiBaseUrl: `${baseUrl}/api`,
      organizationApiKey,
      databaseUrl,
    })}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
