import { defineConfig } from 'tsup'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },
  entry: [
    'src/index.ts',
    'src/Thread.tsx',
    'src/ThreadAnnotationsComponentSource.tsx',
    'src/ThreadAnnotationsComponentDisabled.tsx',
    'src/ThreadFilesEnabled.tsx',
    'src/ThreadFilesEnabledAnnotationsComponentSource.tsx',
    'src/ThreadFilesEnabledAnnotationsComponentDisabled.tsx',
    'src/AudioThread.tsx',
    'src/AudioThreadWebrtcAudioRuntime.tsx',
    'src/ThreadDialog.tsx',
    'src/ThreadDialogAnnotationsComponentSource.tsx',
    'src/ThreadDialogAnnotationsComponentDisabled.tsx',
    'src/ThreadDialogFilesEnabled.tsx',
    'src/ThreadDialogFilesEnabledAnnotationsComponentSource.tsx',
    'src/ThreadDialogFilesEnabledAnnotationsComponentDisabled.tsx',
    'src/AudioThreadDialog.tsx',
    'src/AudioThreadDialogWebrtcAudioRuntime.tsx',
  ],
  sourcemap: true,
  clean: true,
  shims: true,
  platform: 'browser',
  minify: true,
  format: [
    'iife',
    'cjs',
    'esm'
  ],
  injectStyle: true,
  dts: false,
  noExternal: [
    /(.*)/
  ],
})
