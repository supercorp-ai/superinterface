import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import type { MessageAudioOverrides, DefaultAudioSegment } from '@/types'
import { useTtsAudioRuntime } from '@/hooks/audioRuntimes/useTtsAudioRuntime'

export const TtsAudioRuntimeProvider = <TSegment = DefaultAudioSegment,>({
  children,
  onEnd,
  ...overrides
}: {
  children: React.ReactNode
  onEnd?: () => void
} & MessageAudioOverrides<TSegment>) => {
  const { ttsAudioRuntime } = useTtsAudioRuntime<TSegment>({
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
