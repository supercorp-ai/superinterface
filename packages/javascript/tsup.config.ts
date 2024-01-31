import { defineConfig } from 'tsup'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    'src/index.tsx',
    'src/*.ts',
    'src/types/*.ts',
    'src/lib/*.ts',
  ],
  minify: isProduction,
  sourcemap: true,
})
