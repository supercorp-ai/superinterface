import { configDefaults, defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['tests/e2e/**', './tests/e2e/jsdomWithNodeFetch.ts'],
    ],
    exclude: [...configDefaults.exclude, '**/.supercov/**'],
    globals: true,
    setupFiles: [],
    globalSetup: ['tests/e2e/globalSetup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
