import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import nlp from 'compromise'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AudioEngine, type PlayArgs } from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

type MessageSentence = {
  messageId: string
  sentence: string
}

const getMessageSentences = ({
  messageId,
  input,
}: {
  messageId: string
  input: string
}) => {
  const sentences = nlp(input).sentences().json()

  return sentences.map((sentence: { text: string }) => ({
    messageId,
    sentence: sentence.text,
  }))
}

export const useMessageAudio = ({
  onEnd,
  play: passedPlay,
  fullSentenceRegex = /[\.?!]$/,
}: {
  onEnd: () => void
  play?: (args: PlayArgs) => void
  fullSentenceRegex?: RegExp
}) => {
  const [isAudioPlayed, setIsAudioPlayed] = useState(false)
  const [stoppedMessageIds, setStoppedMessageIds] = useState<string[]>([])
  const [playedMessageSentences, setPlayedMessageSentences] = useState<
    MessageSentence[]
  >([])
  const audioPlayer = useAudioPlayer()
  const nextAudioPlayer = useAudioPlayer()
  const superinterfaceContext = useSuperinterfaceContext()
  const [isPlaying, setIsPlaying] = useState(false)
  const isLastSentencePlayedRef = useRef(false)

  const latestMessageProps = useLatestMessage()

  useEffect(() => {
    if (!isPlaying) return

    isLastSentencePlayedRef.current = false
  }, [isPlaying])

  const unplayedMessageSentences = useMemo(() => {
    if (!latestMessageProps.latestMessage) return []
    if (latestMessageProps.latestMessage.role !== 'assistant') return []
    if (stoppedMessageIds.includes(latestMessageProps.latestMessage.id))
      return []

    const input = getInput({
      message: latestMessageProps.latestMessage,
    })

    if (!input) return []

    const messageSentences = getMessageSentences({
      messageId: latestMessageProps.latestMessage.id,
      input,
    })

    return messageSentences.filter(
      (ms: { messageId: string; sentence: string }) =>
        !playedMessageSentences.find(
          (pms) =>
            pms.messageId === ms.messageId && pms.sentence === ms.sentence,
        ),
    )
  }, [latestMessageProps, playedMessageSentences])

  const defaultPlay = useCallback(
    ({ input, onPlay, onStop, onEnd }: PlayArgs) => {
      const searchParams = new URLSearchParams({
        input,
        ...superinterfaceContext.variables,
      })

      audioPlayer.load(
        `${superinterfaceContext.baseUrl}/audio-runtimes/tts?${searchParams}`,
        {
          format: 'mp3',
          autoplay: isAudioPlayed,
          html5: isHtmlAudioSupported,
          onplay: onPlay,
          onstop: onStop,
          onload: () => {
            const nextUnplayedMessageSentence = unplayedMessageSentences[1]
            if (!nextUnplayedMessageSentence) return

            const isNextFullSentence = fullSentenceRegex.test(
              nextUnplayedMessageSentence.sentence,
            )
            if (!isNextFullSentence) return

            const nextSearchParams = new URLSearchParams({
              input: nextUnplayedMessageSentence.sentence,
              ...superinterfaceContext.variables,
            })

            nextAudioPlayer.load(
              `${superinterfaceContext.baseUrl}/audio-runtimes/tts?${nextSearchParams}`,
              {
                format: 'mp3',
                autoplay: false,
                html5: isHtmlAudioSupported,
              },
            )
          },
          onend: onEnd,
        },
      )
    },
    [
      superinterfaceContext,
      unplayedMessageSentences,
      audioPlayer,
      nextAudioPlayer,
      isAudioPlayed,
      fullSentenceRegex,
    ],
  )

  const play = useMemo(
    () => passedPlay || defaultPlay,
    [passedPlay, defaultPlay],
  )

  useEffect(() => {
    if (isPlaying) return
    if (audioPlayer.playing) return
    if (!latestMessageProps.latestMessage) return
    if (latestMessageProps.latestMessage.role !== 'assistant') return

    const firstUnplayedMessageSentence = unplayedMessageSentences[0]
    if (!firstUnplayedMessageSentence) {
      return
    }

    const isFullSentence =
      isOptimistic({ id: latestMessageProps.latestMessage.id }) ||
      latestMessageProps.latestMessage.status !== 'in_progress' ||
      fullSentenceRegex.test(firstUnplayedMessageSentence.sentence)

    if (!isFullSentence) return
    setIsPlaying(true)

    setPlayedMessageSentences((prev) => [...prev, firstUnplayedMessageSentence])

    const input = firstUnplayedMessageSentence.sentence

    play({
      input,
      onPlay: () => {
        setIsAudioPlayed(true)
      },
      onStop: () => {
        setStoppedMessageIds((prev) => [
          ...prev,
          firstUnplayedMessageSentence.messageId,
        ])
        setIsPlaying(false)
      },
      onEnd: () => {
        setIsPlaying(false)

        isLastSentencePlayedRef.current = unplayedMessageSentences.length === 1

        if (
          isLastSentencePlayedRef.current &&
          latestMessageProps.latestMessage.status !== 'in_progress'
        ) {
          onEnd()
          isLastSentencePlayedRef.current = false
        }
      },
    })
  }, [
    unplayedMessageSentences,
    isPlaying,
    superinterfaceContext,
    latestMessageProps,
    audioPlayer,
    nextAudioPlayer,
    playedMessageSentences,
    onEnd,
    play,
    fullSentenceRegex,
  ])

  useEffect(() => {
    if (
      isLastSentencePlayedRef.current &&
      !isPlaying &&
      unplayedMessageSentences.length === 0 &&
      latestMessageProps.latestMessage?.status !== 'in_progress'
    ) {
      onEnd()
      isLastSentencePlayedRef.current = false
    }
  }, [
    isPlaying,
    unplayedMessageSentences.length,
    latestMessageProps.latestMessage?.status,
    onEnd,
  ])

  useEffect(() => {
    if (isHtmlAudioSupported) {
      // @ts-ignore-next-line
      if (!Howler?._howls[0]?._sounds[0]?._node) return

      // @ts-ignore-next-line
      Howler._howls[0]._sounds[0]._node.crossOrigin = 'anonymous'
    }
  }, [audioPlayer])

  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null)

  const isAudioEngineInited = useRef(false)

  useEffect(() => {
    if (!audioPlayer.playing) return
    if (isAudioEngineInited.current) return
    isAudioEngineInited.current = true

    if (isHtmlAudioSupported) {
      const audioContext = new AudioContext()
      setAudioEngine({
        // @ts-ignore-next-line
        source: audioContext.createMediaElementSource(
          Howler._howls[0]._sounds[0]._node,
        ),
        audioContext,
      })
    } else {
      setAudioEngine({
        source: Howler.masterGain,
        audioContext: Howler.ctx,
      })
    }
  }, [audioPlayer, isAudioEngineInited])

  const visualizationAnalyser = useMemo(() => {
    if (!audioEngine) return null

    const result = audioEngine.audioContext.createAnalyser()

    audioEngine.source.connect(audioEngine.audioContext.destination)
    audioEngine.source.connect(result)
    return result
  }, [audioEngine])

  const isPending = useMemo(
    () =>
      isPlaying ||
      unplayedMessageSentences.length > 0 ||
      latestMessageProps.latestMessage?.status === 'in_progress',
    [isPlaying, unplayedMessageSentences, latestMessageProps],
  )

  return {
    isPending,
    isAudioPlayed,
    ...audioPlayer,
    visualizationAnalyser,
  }
}
