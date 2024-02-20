import { defineConfig } from 'tsup'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  splitting: false,
  clean: true,
  platform: 'browser',
  format: ['cjs'],
  noExternal: [
     /(.*)/
    // '@superinterface/react',
    // 'react',
    // 'react-dom',
    // '@radix-ui/themes',
    // '@radix-ui/react-icons',
    // '@tanstack/react-query',
  ],
  injectStyle: true,
  entry: [
    'src/index.tsx',
  ],
  minify: isProduction,
  sourcemap: true,
})
