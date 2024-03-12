import { useMemo, useRef, useState, useEffect } from 'react'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AudioEngine, Message } from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

type Args = {
  onEnd: () => void
}

export const useMessageAudio = ({
  onEnd,
}: Args) => {
  const [playedMessages, setPlayedMessages] = useState<Message[]>([])
  const audioPlayer = useAudioPlayer()
  const superinterfaceContext = useSuperinterfaceContext()

  const latestMessageProps = useLatestMessage()

  useEffect(() => {
    if (audioPlayer.playing) return
    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'assistant') return
    if (playedMessages.find((pm) => pm.id === latestMessageProps.latestMessage.id ||
      (isOptimistic({ id: pm.id }) && pm.content === latestMessageProps.latestMessage.content))) return
    if (playedMessages.includes(latestMessageProps.latestMessage)) return

    const input = getInput({
      message: latestMessageProps.latestMessage,
    })

    if (!input) return

    setPlayedMessages((prev) => [...prev, latestMessageProps.latestMessage])

    audioPlayer.load(`${superinterfaceContext.baseUrl}/tts?input=${input}`, {
      format: 'mp3',
      autoplay: true,
      html5: isHtmlAudioSupported,
      onend: onEnd,
      xhr: {
        ...(superinterfaceContext.publicApiKey ? {
          headers: {
            Authorization: `Bearer ${superinterfaceContext.publicApiKey}`,
          },
        } : {}),
        withCredentials: true,
      }
    })
  }, [
    superinterfaceContext,
    latestMessageProps,
    audioPlayer,
    playedMessages,
    onEnd,
  ])


  const isInited = useRef(false)
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null)

  useEffect(() => {
    if (!audioPlayer.playing) return
    if (isInited.current) return
    isInited.current = true

    if (isHtmlAudioSupported) {
      const audioContext = new AudioContext()
      setAudioEngine({
        // @ts-ignore-next-line
        source: audioContext.createMediaElementSource(Howler._howls[0]._sounds[0]._node),
        audioContext,
      })
    } else {
      setAudioEngine({
        source: Howler.masterGain,
        audioContext: Howler.ctx,
      })
    }
  }, [audioPlayer, isInited])

  const visualizationAnalyser = useMemo(() => {
    if (!audioEngine) return null

    const result = audioEngine.audioContext.createAnalyser()

    audioEngine.source.connect(audioEngine.audioContext.destination)
    audioEngine.source.connect(result)
    return result
  }, [audioEngine])

  return {
    ...audioPlayer,
    visualizationAnalyser,
  }
}
