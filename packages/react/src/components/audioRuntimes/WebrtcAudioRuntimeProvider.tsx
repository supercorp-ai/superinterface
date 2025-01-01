import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import { useWebrtcAudioRuntime } from '@/hooks/audioRuntimes/useWebrtcAudioRuntime'

export const WebrtcAudioRuntimeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { webrtcAudioRuntime } = useWebrtcAudioRuntime()

  return (
    <AudioThreadContext.Provider
      value={{
        audioRuntime: webrtcAudioRuntime,
      }}
    >
      {children}
    </AudioThreadContext.Provider>
  )
}
