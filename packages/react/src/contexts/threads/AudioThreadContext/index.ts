'use client'

import { createContext } from 'react'
import type { AudioRuntime } from '@/types'

export const AudioThreadContext = createContext<{
  audioRuntime: AudioRuntime
}>({
  audioRuntime: {
    user: {
      start: async () => {},
      stop: async () => {},
      pause: async () => {},
      resume: async () => {},
      visualizationAnalyser: null,
      isPending: false,
      rawStatus: 'idle',
    },
    assistant: {
      play: () => {},
      playing: false,
      paused: false,
      isPending: false,
      isReady: false,
      isAudioPlayed: false,
      stop: () => {},
      pause: () => {},
      visualizationAnalyser: null,
      rawStatus: 'idle',
    },
  },
})
