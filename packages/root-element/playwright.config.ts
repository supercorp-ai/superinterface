import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests/e2e'),
  globalSetup: path.resolve(__dirname, 'tests/e2e/globalSetup.ts'),
  fullyParallel: true,
  reporter: 'list',
  use: devices['Desktop Chrome'],
})
