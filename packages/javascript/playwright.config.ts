import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests/e2e'),
  globalSetup: path.resolve(__dirname, 'tests/e2e/globalSetup.ts'),
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: 4,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    permissions: ['microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    },
  },
})
