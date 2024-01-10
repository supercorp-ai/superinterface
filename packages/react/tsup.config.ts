import { defineConfig } from 'tsup'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    'src/index.ts',
    'src/*.ts',
    'src/types/*.ts',
    'src/lib/*.ts',
  ],
  format: ['cjs', 'esm'],
  minify: isProduction,
  sourcemap: true,
})
  // "exports": {
  //   ".": "./dist/index.js",
  //   "./*": "./dist/*.js",
  //   "./types": "./dist/types/index.js",
  //   "./lib": "./dist/lib/index.js"
  // },
