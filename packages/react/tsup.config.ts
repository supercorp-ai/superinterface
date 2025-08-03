import { defineConfig } from 'tsup'
import babel from 'esbuild-plugin-babel'

const ReactCompilerConfig = {
  target: '18',
}

export default defineConfig({
  entry: ['src/*.ts', 'src/types/*.ts', 'src/enums/*.ts'],
  esbuildPlugins: [
    babel({
      config: {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                esmodules: true,
              },
            },
          ],
          '@babel/preset-typescript',
          [
            '@babel/preset-react',
            {
              runtime: 'automatic',
            },
          ],
        ],
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
      },
    }),
  ],
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'],
  dts: true,
  external: ['react', 'react-dom', '@tanstack/react-query'],
})
