import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import nlp from 'compromise'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useMessages } from '@/hooks/messages/useMessages'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AudioEngine, type PlayArgs } from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

type AudioMessage = {
  id: string
  status: 'in_progress' | string // adapt to your real union
  sentences: string[]
  nextIndex: number // next sentence to play for this message
  stopped: boolean
}

const segment = (input: string) =>
  nlp(input)
    .sentences()
    .json()
    .map((s: { text: string }) => s.text)

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
  const audioPlayer = useAudioPlayer()
  const nextAudioPlayer = useAudioPlayer()
  const superinterfaceContext = useSuperinterfaceContext()
  const [isPlaying, setIsPlaying] = useState(false)

  // ----- single source of truth
  const [audioQueue, setAudioQueue] = useState<AudioMessage[]>([])
  const audioQueueRef = useRef<AudioMessage[]>([])
  useEffect(() => {
    audioQueueRef.current = audioQueue
  }, [audioQueue])

  // prevents double-pick during rapid re-renders while starting playback
  const pickLockRef = useRef(false)

  const currentSentenceRef = useRef<{
    messageId: string
    index: number
  } | null>(null)

  const messagesProps = useMessages()

  // Mirror assistant messages -> audioQueue (preserve progress), ensure oldest->newest order
  useEffect(() => {
    const assistantsDesc = messagesProps.messages.filter(
      (m: any) => m.role === 'assistant',
    )
    const assistantsAsc = [...assistantsDesc].reverse() // your store is DESC; we want ASC

    setAudioQueue((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]))
      const next: AudioMessage[] = []

      for (const m of assistantsAsc) {
        const inp = getInput({ message: m })
        if (inp == null) continue

        const sentences = segment(inp)
        const existing = prevById.get(m.id)

        next.push({
          id: m.id,
          status: m.status,
          sentences,
          // keep progress; clamp if segmentation shrank
          nextIndex: Math.min(existing?.nextIndex ?? 0, sentences.length),
          stopped: existing?.stopped ?? false,
        })
      }

      return next
    })
  }, [messagesProps.messages])

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
          autoplay: isAudioPlayed, // first call false, subsequent true for gapless feel
          html5: isHtmlAudioSupported,
          onplay: onPlay,
          onstop: onStop,
          onload: () => {
            // Preload the next sentence from the SAME message
            const current = currentSentenceRef.current
            if (!current) return
            const msg = audioQueueRef.current.find(
              (m) => m.id === current.messageId,
            )
            if (!msg) return

            const nextSentence = msg.sentences[msg.nextIndex]
            if (!nextSentence) return
            if (!fullSentenceRegex.test(nextSentence)) return

            const nextSearchParams = new URLSearchParams({
              input: nextSentence,
              ...superinterfaceContext.variables,
            })

            nextAudioPlayer.load(
              `${superinterfaceContext.baseUrl}/audio-runtimes/tts?${nextSearchParams}`,
              { format: 'mp3', autoplay: false, html5: isHtmlAudioSupported },
            )
          },
          onend: onEnd,
        },
      )
    },
    [
      superinterfaceContext,
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

  // Pick the next sentence (earliest assistant message with a playable next sentence)
  useEffect(() => {
    if (isPlaying) return
    if (audioPlayer.playing) return
    if (pickLockRef.current) return

    // find first eligible sentence
    let candidate: {
      messageId: string
      sentence: string
      index: number
      ownerStatus: AudioMessage['status']
    } | null = null

    for (const msg of audioQueue) {
      if (msg.stopped) continue
      const sentence = msg.sentences[msg.nextIndex]
      if (!sentence) continue

      // IMPORTANT: gate using THIS MESSAGE'S status
      const isFull =
        isOptimistic({ id: msg.id }) ||
        msg.status !== 'in_progress' ||
        fullSentenceRegex.test(sentence)

      if (isFull) {
        candidate = {
          messageId: msg.id,
          sentence,
          index: msg.nextIndex,
          ownerStatus: msg.status,
        }
        break
      }
    }

    if (!candidate) return

    // lock the pick so a render in between can't pick again
    pickLockRef.current = true
    setIsPlaying(true)
    currentSentenceRef.current = {
      messageId: candidate.messageId,
      index: candidate.index,
    }

    // increment progress immediately (prevents duplicates)
    setAudioQueue((prev) =>
      prev.map((m) =>
        m.id === candidate!.messageId
          ? { ...m, nextIndex: m.nextIndex + 1 }
          : m,
      ),
    )

    play({
      input: candidate.sentence,
      onPlay: () => {
        setIsAudioPlayed(true)
      },
      onStop: () => {
        // stop this message from further playback
        setAudioQueue((prev) =>
          prev.map((m) =>
            m.id === candidate!.messageId ? { ...m, stopped: true } : m,
          ),
        )
        setIsPlaying(false)
        currentSentenceRef.current = null
        pickLockRef.current = false
      },
      onEnd: () => {
        setIsPlaying(false)
        currentSentenceRef.current = null
        pickLockRef.current = false

        // If nothing pending across the queue, fire onEnd
        const hasPending = audioQueueRef.current.some((m) => {
          if (m.stopped) return false
          const hasMore = m.nextIndex < m.sentences.length
          const streaming = m.status === 'in_progress'
          return hasMore || streaming
        })
        if (!hasPending) onEnd()
      },
    })
  }, [
    isPlaying,
    audioPlayer.playing,
    audioQueue,
    play,
    fullSentenceRegex,
    onEnd,
  ])

  // Cross-origin for HTML5 audio element
  useEffect(() => {
    if (isHtmlAudioSupported) {
      // @ts-ignore-next-line
      if (!Howler?._howls[0]?._sounds[0]?._node) return
      // @ts-ignore-next-line
      Howler._howls[0]._sounds[0]._node.crossOrigin = 'anonymous'
    }
  }, [audioPlayer])

  // Visualizer wiring
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
          // @ts-ignore-next-line
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
  }, [audioPlayer])

  const visualizationAnalyser = useMemo(() => {
    if (!audioEngine) return null
    const analyser = audioEngine.audioContext.createAnalyser()
    audioEngine.source.connect(audioEngine.audioContext.destination)
    audioEngine.source.connect(analyser)
    return analyser
  }, [audioEngine])

  const isPending = useMemo(
    () =>
      isPlaying ||
      audioQueue.some(
        (m) =>
          !m.stopped &&
          (m.nextIndex < m.sentences.length || m.status === 'in_progress'),
      ),
    [isPlaying, audioQueue],
  )

  return {
    isPending,
    isAudioPlayed,
    ...audioPlayer,
    visualizationAnalyser,
  }
}
