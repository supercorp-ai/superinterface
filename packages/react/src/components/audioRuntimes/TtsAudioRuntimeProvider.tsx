import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import type { MessageAudioOverrides } from '@/types'
import { useTtsAudioRuntime } from '@/hooks/audioRuntimes/useTtsAudioRuntime'

export const TtsAudioRuntimeProvider = ({
  children,
  onEnd,
  ...overrides
}: {
  children: React.ReactNode
  onEnd?: () => void
} & MessageAudioOverrides) => {
  const { ttsAudioRuntime } = useTtsAudioRuntime({
    onEnd,
    ...overrides,
  })

  return (
    <AudioThreadContext.Provider
      value={{
        audioRuntime: ttsAudioRuntime,
      }}
    >
      {children}
    </AudioThreadContext.Provider>
  )
}
