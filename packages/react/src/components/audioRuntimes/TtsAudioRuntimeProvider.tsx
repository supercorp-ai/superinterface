import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import type { PlayArgs } from '@/types'
import { useTtsAudioRuntime } from '@/hooks/audioRuntimes/useTtsAudioRuntime'

export const TtsAudioRuntimeProvider = ({
  children,
  play,
  onEnd,
}: {
  children: React.ReactNode
  play?: (args: PlayArgs) => void
  onEnd?: () => void
}) => {
  const { ttsAudioRuntime } = useTtsAudioRuntime({
    play,
    onEnd,
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
