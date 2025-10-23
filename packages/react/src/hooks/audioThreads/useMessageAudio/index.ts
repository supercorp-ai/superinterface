import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import nlp from 'compromise' // kept in case you want to switch back
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
  nextIndex: number
  stopped: boolean
}

/** Super light sentence splitter (fast, GC-friendly) */
const splitSentencesFast = (text: string): string[] => {
  // Normalize whitespace once to stabilize results
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return []
  // Split on end punctuation followed by space. Good enough for TTS cadence.
  const parts = t.split(/(?<=[.!?])\s+(?=[^\s])/g)
  return parts
}

/** Incremental segmentation cache: only re-segment the appended tail. */
type SegCacheEntry = { input: string; sentences: string[] }
const getIncrementalSentences = (
  prev: SegCacheEntry | undefined,
  nextInput: string,
): SegCacheEntry => {
  if (!prev) {
    // first time
    return { input: nextInput, sentences: splitSentencesFast(nextInput) }
  }
  if (nextInput === prev.input) {
    // unchanged
    return prev
  }
  // If text only appended, re-segment just the tail + previous last.
  if (nextInput.startsWith(prev.input)) {
    const prevLast = prev.sentences[prev.sentences.length - 1] ?? ''
    const baseLen = prev.input.length - prevLast.length
    if (baseLen >= 0 && prev.input.slice(baseLen) === prevLast) {
      // Re-segment the "tail" consisting of the previous last sentence plus the appended text.
      const tail = nextInput.slice(baseLen)
      const tailSegments = splitSentencesFast(tail)
      const merged =
        prev.sentences.length > 0
          ? [...prev.sentences.slice(0, -1), ...tailSegments]
          : tailSegments
      return { input: nextInput, sentences: merged }
    }
  }
  // Fallback: full re-segmentation (rare: edits, tool rewrites, etc.)
  return { input: nextInput, sentences: splitSentencesFast(nextInput) }
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

  // Segmentation cache per messageId
  const segCacheRef = useRef<Map<string, SegCacheEntry>>(new Map())

  // Mirror assistant messages -> audioQueue (preserve progress),
  // **incremental** segmentation, and **no-op** if nothing actually changed.
  useEffect(() => {
    const assistantsDesc = messagesProps.messages.filter(
      (m: any) => m.role === 'assistant',
    )
    const assistantsAsc = [...assistantsDesc].reverse() // store oldest -> newest

    setAudioQueue((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]))

      let changed = false
      const next: AudioMessage[] = []

      for (const m of assistantsAsc) {
        const inp = getInput({ message: m })
        if (inp == null) continue

        const prevSeg = segCacheRef.current.get(m.id)
        const nextSeg = getIncrementalSentences(prevSeg, inp)
        // Update cache only if it changed
        if (!prevSeg || nextSeg.input !== prevSeg.input) {
          segCacheRef.current.set(m.id, nextSeg)
        }

        const existing = prevById.get(m.id)
        const sentences = nextSeg.sentences
        const nextIndex = Math.min(existing?.nextIndex ?? 0, sentences.length)
        const stopped = existing?.stopped ?? false

        // Reuse existing object if nothing material changed to avoid renders.
        const reuseExisting =
          !!existing &&
          existing.status === m.status &&
          existing.sentences === sentences && // same array ref -> no change
          existing.nextIndex === nextIndex &&
          existing.stopped === stopped

        if (reuseExisting) {
          next.push(existing)
        } else {
          next.push({
            id: m.id,
            status: m.status,
            sentences,
            nextIndex,
            stopped,
          })
          changed = true
        }
      }

      // If the number of messages changed, or order/ids changed, mark changed.
      if (next.length !== prev.length) {
        changed = true
      } else {
        for (let i = 0; i < next.length; i++) {
          if (next[i] !== prev[i]) {
            changed = true
            break
          }
        }
      }

      return changed ? next : prev
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
          autoplay: isAudioPlayed, // first call false; then true for snappier chaining
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

    let candidate: {
      messageId: string
      sentence: string
      index: number
      ownerStatus: AudioMessage['status']
    } | null = null

    // O(ldest)->N(ewest)
    for (const msg of audioQueue) {
      if (msg.stopped) continue

      // Skip obviously empty/whitespace fragments to avoid " - " stalls
      let sentence = msg.sentences[msg.nextIndex]
      while (sentence && !/\S/.test(sentence)) {
        // advance over empty segments (no audio/calls)
        msg.nextIndex++
        sentence = msg.sentences[msg.nextIndex]
      }
      if (!sentence) continue

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

    pickLockRef.current = true
    setIsPlaying(true)
    currentSentenceRef.current = {
      messageId: candidate.messageId,
      index: candidate.index,
    }

    // Increment progress immediately (prevents duplicates)
    setAudioQueue((prev) =>
      prev.map((m) =>
        m.id === candidate!.messageId
          ? { ...m, nextIndex: m.nextIndex + 1 }
          : m,
      ),
    )

    play({
      input: candidate.sentence,
      onPlay: () => setIsAudioPlayed(true),
      onStop: () => {
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
          Howler._howls[0]?._sounds[0]?._node,
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
