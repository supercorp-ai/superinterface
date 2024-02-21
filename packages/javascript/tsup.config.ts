import { defineConfig } from 'tsup'

// const isProduction = process.env.NODE_ENV === 'production'
//
// export default defineConfig({
//   splitting: false,
//   clean: true,
//   platform: 'browser',
//   format: ['cjs'],
//   noExternal: [
//      /(.*)/
//     // '@superinterface/react',
//     // 'react',
//     // 'react-dom',
//     // '@radix-ui/themes',
//     // '@radix-ui/react-icons',
//     // '@tanstack/react-query',
//   ],
//   injectStyle: true,
//   entry: [
//     'src/index.tsx',
//   ],
//   minify: isProduction,
//   sourcemap: true,
// })
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  entry: ['src/index.tsx'],
  sourcemap: true,
  clean: true,
  shims: true,
  platform: 'browser',
  format: [
    // 'iife',
    'cjs',
    // 'esm'
  ],
  injectStyle: true,
  // globalName: 'Superinterface',
  dts: false,
  noExternal: [
    /(.*)/
  ],
})
