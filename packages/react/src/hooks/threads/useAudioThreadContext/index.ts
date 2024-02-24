import { useContext } from 'react'
import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'

export const useAudioThreadContext = () => (
  useContext(AudioThreadContext)
)
