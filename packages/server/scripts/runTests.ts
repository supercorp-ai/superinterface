import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const dbName = `superinterface_test_${randomUUID()}`
const dbUrl = `postgresql://postgres:postgres@localhost:5432/${dbName}`

console.log(`Creating database ${dbName}`)
execSync(`createdb -h localhost -U postgres ${dbName}`, {
  stdio: 'inherit',
  env: { ...process.env, PGPASSWORD: 'postgres' },
})

const commonEnv = { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl }

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: commonEnv })
  execSync(
    'node --import tsx --experimental-test-module-mocks --test tests/**/*.test.ts',
    {
      stdio: 'inherit',
      env: { ...commonEnv, NODE_ENV: 'test' },
    },
  )
} finally {
  console.log(`Database ${dbName} preserved for inspection`)
}
