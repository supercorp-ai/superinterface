import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'

export type TestServer = {
  baseUrl: string
  apiBaseUrl: string
  organizationApiKey: string
  databaseUrl: string
}

const READY_MARKER = 'SUPERINTERFACE_TEST_SERVER '

const serverDir = path.resolve(__dirname, '../../../../server')

// Starts the real @superinterface/server (next dev + a fresh database).
export const startTestServer = (): Promise<{
  child: ChildProcess
  testServer: TestServer
}> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['--import', 'tsx', 'scripts/e2e/testServer.ts'],
      { cwd: serverDir, stdio: ['ignore', 'pipe', 'inherit'] },
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
