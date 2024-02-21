import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/*.ts',
    'src/types/*.ts',
  ],
  splitting: false,
  sourcemap: true,
  clean: true,
  format: [
    'esm',
    'cjs',
  ],
  dts: true,
  external: [
    'react',
    'react-dom',
    '@tanstack/react-query',
  ],
})
