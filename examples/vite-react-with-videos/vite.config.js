import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        thread: './src/Thread.jsx',
        audioThread: './src/AudioThread.jsx',
      },
      output: {
        manualChunks: undefined,  // Prevent chunk splitting
        entryFileNames: '[name].js',  // Outputs: thread.js, audioThread.js
      },
    },
  },
})
