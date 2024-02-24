import { useMemo, useRef, useState, useEffect } from 'react'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useLatestThreadMessage } from '@/hooks/threadMessages/useLatestThreadMessage'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AudioEngine } from '@/types'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

type Args = {
  onEnd: () => void
}

export const useMessageAudio = ({
  onEnd,
}: Args) => {
  const [playedMessageIds, setPlayedMessageIds] = useState<string[]>([])
  const audioPlayer = useAudioPlayer()
  const superinterfaceContext = useSuperinterfaceContext()

  const latestThreadMessageProps = useLatestThreadMessage()

  useEffect(() => {
    if (audioPlayer.playing) return
    if (!latestThreadMessageProps.latestThreadMessage) return
    if (latestThreadMessageProps.latestThreadMessage.role !== 'assistant') return
    if (playedMessageIds.includes(latestThreadMessageProps.latestThreadMessage.id)) return

    const input = getInput({
      threadMessage: latestThreadMessageProps.latestThreadMessage,
    })

    if (!input) return

    setPlayedMessageIds((prev) => [...prev, latestThreadMessageProps.latestThreadMessage.id])

    audioPlayer.load(`${superinterfaceContext.baseUrl}/tts?input=${input}`, {
      format: 'mp3',
      autoplay: true,
      html5: isHtmlAudioSupported,
      onend: onEnd,
    })
  }, [
    superinterfaceContext,
    latestThreadMessageProps,
    audioPlayer,
    playedMessageIds,
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