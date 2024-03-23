import { useMemo, useRef, useState, useEffect } from 'react'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AudioEngine } from '@/types'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

type MessageSentence = {
  messageId: string
  sentence: string
}


const SPLIT_SENTENCE_REGEX = /[^\.\?!]+[\.\?!]/g
const FULL_SENTENCE_REGEX = /^\s*[A-Z].*[.?!]$/

const getMessageSentences = ({
  messageId,
  input,
}: {
  messageId: string
  input: string
}) => {
  const sentences = input.match(SPLIT_SENTENCE_REGEX) || []

  return sentences.map((sentence) => ({
    messageId,
    sentence,
  }))
}

export const useMessageAudio = ({
  onEnd,
}: {
  onEnd: () => void
}) => {
  const [playedMessageSentences, setPlayedMessageSentences] = useState<MessageSentence[]>([])
  const audioPlayer = useAudioPlayer()
  const superinterfaceContext = useSuperinterfaceContext()
  const [isPlaying, setIsPlaying] = useState(false)

  const latestMessageProps = useLatestMessage()

  const unplayedMessageSentences = useMemo(() => {
    if (!latestMessageProps.latestMessage) return []
    if (latestMessageProps.latestMessage.role !== 'assistant') return []

    const input = getInput({
      message: latestMessageProps.latestMessage,
    })

    if (!input) return []

    const messageSentences = getMessageSentences({
      messageId: latestMessageProps.latestMessage.id,
      input,
    })

    return messageSentences.filter((ms) => (
      !playedMessageSentences.find((pms) => pms.messageId === ms.messageId && pms.sentence === ms.sentence)
    ))
  }, [latestMessageProps, playedMessageSentences])

  useEffect(() => {
    if (isPlaying) return
    if (audioPlayer.playing) return
    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'assistant') return

    const firstUnplayedMessageSentence = unplayedMessageSentences[0]
    if (!firstUnplayedMessageSentence) {
      return
    }

    const isFullSentence = FULL_SENTENCE_REGEX.test(firstUnplayedMessageSentence.sentence)

    if (!isFullSentence) return
    setIsPlaying(true)

    setPlayedMessageSentences((prev) => [...prev, firstUnplayedMessageSentence])

    const searchParams = new URLSearchParams({
      input: firstUnplayedMessageSentence.sentence,
      ...superinterfaceContext.variables,
    })

    audioPlayer.load(`${superinterfaceContext.baseUrl}/tts?${searchParams}`, {
      format: 'mp3',
      autoplay: true,
      html5: isHtmlAudioSupported,
      onend: () => {
        setIsPlaying(false)

        if (unplayedMessageSentences.length === 1 && latestMessageProps.latestMessage.status !== 'in_progress') {
          onEnd()
        }
      },
    })
  }, [
    unplayedMessageSentences,
    isPlaying,
    superinterfaceContext,
    latestMessageProps,
    audioPlayer,
    playedMessageSentences,
    onEnd,
  ])

  const isInited = useRef(false)
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null)

  useEffect(() => {
    if (isHtmlAudioSupported) {
      if (!Howler?._howls[0]?._sounds[0]?._node) return

      Howler._howls[0]._sounds[0]._node.crossOrigin = 'anonymous'
    }
  }, [audioPlayer])

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

  const isPending = useMemo(() => isPlaying || unplayedMessageSentences.length > 0, [isPlaying, unplayedMessageSentences])

  return {
    isPending,
    ...audioPlayer,
    visualizationAnalyser,
  }
}
