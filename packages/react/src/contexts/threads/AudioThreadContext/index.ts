'use client'
import { createContext } from 'react'
import { statusMessages } from '@/hooks/audioThreads/useStatus/lib/statusMessages'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import { useMessageAudio } from '@/hooks/audioThreads/useMessageAudio'

export const AudioThreadContext = createContext<{
  status: keyof typeof statusMessages
  recorderProps: ReturnType<typeof useRecorder>
  messageAudioProps: ReturnType<typeof useMessageAudio>
}>({
  status: 'idle',
  recorderProps: {
    status: 'idle',
    start: async () => {},
    stop: async () => {},
    pause: async () => {},
    resume: async () => {},
    visualizationAnalyser: null,
  },
  messageAudioProps: {
    visualizationAnalyser: null,
    playing: false,
    paused: false,
    isReady: false,
    play: async () => {},
    pause: async () => {},
  },
})
