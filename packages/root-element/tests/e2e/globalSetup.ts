import { startStaticServer } from './lib/startStaticServer'

// Starts the static server once for the whole run. Workers read its URL
// from the environment.
export default async function globalSetup() {
  const staticServer = await startStaticServer()
  process.env.E2E_STATIC_BASE_URL = staticServer.baseUrl

  return () => staticServer.close()
}
