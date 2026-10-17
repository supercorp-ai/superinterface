import { startTestServer } from './lib/startTestServer'
import { startStaticServer } from './lib/startStaticServer'

// Starts the real server and a static server for the built embeds once for
// the whole run. Workers read their URLs from the environment.
export default async function globalSetup() {
  const [{ child, testServer }, staticServer] = await Promise.all([
    startTestServer(),
    startStaticServer(),
  ])

  process.env.E2E_TEST_SERVER = JSON.stringify(testServer)
  process.env.E2E_STATIC_BASE_URL = staticServer.baseUrl

  return async () => {
    await staticServer.close()
    await new Promise<void>((resolve) => {
      child.on('exit', () => resolve())
      child.kill('SIGTERM')
    })
  }
}
