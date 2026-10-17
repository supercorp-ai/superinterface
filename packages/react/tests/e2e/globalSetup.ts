import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import type { GlobalSetupContext } from 'vitest/node'
import { startFakeUpstashRedis } from '../../../server/tests/lib/redis/startFakeUpstashRedis'
import { startOpenaiRouter } from './lib/startOpenaiRouter'

export type TestServer = {
  baseUrl: string
  apiBaseUrl: string
  organizationApiKey: string
}

declare module 'vitest' {
  export interface ProvidedContext {
    testServer: TestServer
  }
}

const READY_MARKER = 'SUPERINTERFACE_TEST_SERVER '

const serverDir = path.resolve(__dirname, '../../../server')

// Starts the real @superinterface/server (next dev + a fresh database) once
// for the whole run, and shares its URL and organization key with the tests.
const startTestServer = ({
  env,
}: {
  env: NodeJS.ProcessEnv
}): Promise<{
  child: ChildProcess
  testServer: TestServer
}> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--import', 'tsx', 'scripts/e2e/testServer.ts'],
      { cwd: serverDir, env, stdio: ['ignore', 'pipe', 'inherit'] },
    )
    let output = ''

    child.stdout!.on('data', (chunk: Buffer) => {
      output += chunk.toString()
      const line = output
        .split('\n')
        .find((candidate) => candidate.startsWith(READY_MARKER))
      if (!line) return

      resolve({
        child,
        testServer: JSON.parse(line.slice(READY_MARKER.length)),
      })
    })
    child.on('exit', (code) =>
      reject(new Error(`Test server exited early with code ${code}`)),
    )
  })

export default async function setup({ provide }: GlobalSetupContext) {
  // CLIENT_TOOL functions wait for the client's output in Redis; the spawned
  // server inherits these variables and talks to this in-memory fake.
  const redis = await startFakeUpstashRedis()
  process.env.UPSTASH_REDIS_REST_URL = redis.url
  process.env.UPSTASH_REDIS_REST_TOKEN = redis.token

  const openaiRouter = await startOpenaiRouter()
  const { child, testServer } = await startTestServer({
    env: { ...process.env, OPENAI_BASE_URL: openaiRouter.baseURL },
  })
  provide('testServer', testServer)

  return () =>
    new Promise<void>((resolve) => {
      child.on('exit', () =>
        Promise.all([redis.close(), openaiRouter.close()]).then(() =>
          resolve(),
        ),
      )
      child.kill('SIGTERM')
    })
}
