import { resolve } from 'path'
import { defineConfig } from 'tsup'

export default defineConfig({
  esbuildOptions(options) {
    options.alias = {
      '@': resolve(__dirname, './src'),
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  entry: [
    'src/Thread.tsx',
    'src/AudioThread.tsx',
    'src/ThreadDialog.tsx',
    'src/AudioThreadDialog.tsx',
  ],
  sourcemap: true,
  clean: true,
  shims: true,
  platform: 'browser',
  minify: true,
  format: ['iife', 'cjs', 'esm'],
  injectStyle: true,
  dts: false,
  noExternal: [/(.*)/],
})
