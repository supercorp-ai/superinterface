import { defineConfig } from 'tsup'

export default defineConfig({
  splitting: false,
  clean: true,
  platform: 'browser',
  format: ['cjs'],
  noExternal: [
    '@superinterface/react',
    'react',
    'react-dom',
    '@radix-ui/themes',
  ],
  injectStyle: true,
  entry: [
    'src/index.tsx',
  ],
  minify: true,
  sourcemap: true,
})
