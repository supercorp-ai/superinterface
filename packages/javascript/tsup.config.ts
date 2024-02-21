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
  sourcemap: true, // Enable source maps
  clean: true, // Clean the `dist` folder before building
  format: [
    'iife',
    // 'cjs',
    // 'esm'
  ], // Bundle as an IIFE for direct use in browsers
  injectStyle: true,
  globalName: 'MyLibrary', // Global variable name to access your library
  dts: false, // No need for declaration files here
  noExternal: [
    /(.*)/
  ],
  // external: [
  //   'react',
  //   'react-dom',
  //   '@tanstack/react-query',
  // ], // Externalize peer dependencies
  // external: ['react', 'react-dom'], // Assume React is loaded separately in the consumer environment
  // Optionally, configure tsup to inline any assets or styles your library might use
})
