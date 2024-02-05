import { defineConfig } from 'tsup'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  splitting: false,
  clean: true,
  dts: true,
  format: ['iife'],
  entry: [
    'src/index.tsx',
  ],
  minify: isProduction,
  sourcemap: true,
  esbuildOptions(options) {
    options.define = {
      "process.env.NODE_ENV": JSON.stringify("production"),
    }

    options.banner = {
      js: '"use client"',
    }
  },
})
