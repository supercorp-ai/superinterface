import type { TestServer } from './startTestServer'

// The test server globalSetup started, as seen from a worker.
export const testServer = (): TestServer =>
  JSON.parse(process.env.E2E_TEST_SERVER!)
