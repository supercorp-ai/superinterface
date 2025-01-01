'use client'

import { createContext } from 'react'
import type { AudioRuntime } from '@/types'

export const AudioThreadContext = createContext<{
  audioRuntime: AudioRuntime | null
}>({
  audioRuntime: null,
})
