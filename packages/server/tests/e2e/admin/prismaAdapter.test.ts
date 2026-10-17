import assert from 'node:assert'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { describe, it } from 'node:test'

const execFileAsync = promisify(execFile)

const prismaModuleUrl = pathToFileURL(
  path.resolve(import.meta.dirname, '../../../src/lib/prisma/index.ts'),
).href

// Runs in a fresh Node process so the prisma singleton is built from scratch
// with production-like env instead of NODE_ENV=test.
const childScript = `
const existing = process.env.PRESET_GLOBAL_PRISMA ? { preset: true } : null
if (existing) globalThis.prisma = existing
const hadGlobal = globalThis.prisma !== undefined
const { prisma } = await import(${JSON.stringify(prismaModuleUrl)})
const result = {
  hadGlobal,
  reusedGlobal: prisma === existing,
  globalIsExported: globalThis.prisma === prisma,
}
if (!existing) {
  result.adapterName = prisma._engineConfig?.adapter?.adapterName ?? null
  // The Neon adapter keeps its connection string; a direct client keeps it
  // as its datasource override.
  result.connectionString =
    prisma._engineConfig?.adapter?.config?.connectionString ??
    prisma._engineConfig?.overrideDatasources?.db?.url ??
    null
  try {
    const rows = await prisma.$queryRaw\`SELECT 1 AS one\`
    result.query = rows[0].one
  } catch {
    result.query = 'failed'
  }
  await prisma.$disconnect().catch(() => {})
}
console.log(JSON.stringify(result))
`

const loadPrisma = async ({
  databaseAdapter,
  presetGlobal = false,
}: {
  databaseAdapter?: string
  presetGlobal?: boolean
}) => {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'production' }
  delete env.DATABASE_ADAPTER
  delete env.PRESET_GLOBAL_PRISMA
  if (databaseAdapter !== undefined) env.DATABASE_ADAPTER = databaseAdapter
  if (presetGlobal) env.PRESET_GLOBAL_PRISMA = '1'

  const { stdout } = await execFileAsync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', childScript],
    { env, timeout: 30_000 },
  )

  const lines = stdout.trim().split('\n')
  return JSON.parse(lines[lines.length - 1])
}

describe('prisma client adapter selection', () => {
  it('connects directly to Postgres for direct-style adapters', async () => {
    for (const databaseAdapter of [' Direct ', 'supabase']) {
      const result = await loadPrisma({ databaseAdapter })
      assert.deepStrictEqual(result, {
        hadGlobal: false,
        reusedGlobal: false,
        globalIsExported: true,
        adapterName: null,
        connectionString: process.env.DATABASE_URL,
        query: 1,
      })
    }
  })

  it('uses the Neon serverless adapter by default and for neon values', async () => {
    for (const databaseAdapter of [undefined, 'vercel', 'unknown']) {
      const result = await loadPrisma({ databaseAdapter })
      // The resolved DATABASE_ADAPTER picks the Neon adapter, so the client
      // reports it as its driver adapter. Without it the module would build
      // a direct client (adapterName null) whose query succeeds.
      assert.strictEqual(
        result.adapterName,
        '@prisma/adapter-neon',
        String(databaseAdapter),
      )
      // The Neon driver talks WebSockets, not the Postgres TCP protocol, so
      // the query against the local test database fails.
      assert.deepStrictEqual(result, {
        hadGlobal: false,
        reusedGlobal: false,
        globalIsExported: true,
        adapterName: '@prisma/adapter-neon',
        connectionString: process.env.DATABASE_URL,
        query: 'failed',
      })
    }
  })

  it('reuses an existing global client instead of creating a new one', async () => {
    const result = await loadPrisma({
      databaseAdapter: 'direct',
      presetGlobal: true,
    })
    assert.deepStrictEqual(result, {
      hadGlobal: true,
      reusedGlobal: true,
      globalIsExported: true,
    })
  })

  it('resolves the database adapter before building the client', async () => {
    // `adapterName` is the driver adapter the built client was given: the
    // Neon adapter when the resolved database adapter is 'neon', none when it
    // is 'direct'. An unresolved adapter would fall through to a direct
    // client for 'neon' as well.
    const neon = await loadPrisma({ databaseAdapter: 'neon' })
    assert.strictEqual(neon.adapterName, '@prisma/adapter-neon')

    const direct = await loadPrisma({ databaseAdapter: 'postgres' })
    assert.strictEqual(direct.adapterName, null)
  })

  it('builds the client with the DATABASE_URL connection string', async () => {
    assert.ok(process.env.DATABASE_URL)

    for (const databaseAdapter of ['neon', 'direct']) {
      const { connectionString } = await loadPrisma({ databaseAdapter })
      assert.strictEqual(
        connectionString,
        process.env.DATABASE_URL,
        databaseAdapter,
      )
    }
  })

  it('stores a newly created prisma client on globalThis.prisma', async () => {
    const { hadGlobal, globalIsExported } = await loadPrisma({
      databaseAdapter: 'direct',
    })

    // Before the import there is no global client; afterwards the exported
    // client is the one cached on globalThis.prisma for later imports.
    assert.strictEqual(hadGlobal, false)
    assert.strictEqual(globalIsExported, true)
  })
})
