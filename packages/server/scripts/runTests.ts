import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const dbName = `superinterface_test_${randomUUID()}`
const dbUrl = `postgresql://postgres:postgres@localhost:5432/${dbName}?connection_limit=2`

console.log(`Creating database ${dbName}`)
execSync(`createdb -h localhost -U postgres ${dbName}`, {
  stdio: 'inherit',
  env: { ...process.env, PGPASSWORD: 'postgres' },
})

const commonEnv = { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl }

const testPaths = process.argv.slice(2)
const testPattern = testPaths.length
  ? testPaths.join(' ')
  : "'tests/**/*.test.ts'"

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: commonEnv })
  execSync(
    `node --import tsx --experimental-test-module-mocks --test --test-isolation=process --test-concurrency=8 --test-force-exit ${testPattern}`,
    {
      stdio: 'inherit',
      env: { ...commonEnv, NODE_ENV: 'test' },
    },
  )
} finally {
  console.log(`Database ${dbName} preserved for inspection`)
}
