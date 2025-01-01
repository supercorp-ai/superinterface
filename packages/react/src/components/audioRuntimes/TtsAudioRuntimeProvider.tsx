import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import type { PlayArgs } from '@/types'
import { useTtsAudioRuntime } from '@/hooks/audioRuntimes/useTtsAudioRuntime'

export const TtsAudioRuntimeProvider = ({
  children,
  play,
}: {
  children: React.ReactNode
  play?: (args: PlayArgs) => void
}) => {
  const { ttsAudioRuntime } = useTtsAudioRuntime({
    play,
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
