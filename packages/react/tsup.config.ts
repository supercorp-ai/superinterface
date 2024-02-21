import { defineConfig } from 'tsup'

// const isProduction = process.env.NODE_ENV === 'production'
//
// export default defineConfig({
//   clean: true,
//   dts: true,
//   entry: [
//     'src/index.ts',
//     'src/*.ts',
//     'src/types/*.ts',
//     'src/lib/*.ts',
//   ],
//   minify: isProduction,
//   sourcemap: true,
// })
export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false, // You usually don't need code splitting for a library
  sourcemap: true, // Enable source maps for better debugging
  clean: true, // Clean the `dist` folder before building
  format: [
    'esm',
    'cjs',
  ], // Bundle in both ESM and CommonJS formats
  dts: true, // Generate .d.ts files
  external: [
    'react',
    'react-dom',
    '@tanstack/react-query',
  ], // Externalize peer dependencies
})
