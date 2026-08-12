import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import type { PlayArgs, SerializedMessage } from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { input as getInput } from './input'
import { isHtmlAudioSupported } from './isHtmlAudioSupported'

type DefaultPlayArgs = PlayArgs

type AudioMessageState = {
  id: string
  status: 'in_progress' | string
  sentences: string[]
  nextIndex: number
  playableCount: number
  stopped: boolean
  order: number
  fallbackOrder: number
}

type ChunkState = {
  remaining: number
  onPlay: () => void
  onStop: () => void
  onEnd: () => void
  started: boolean
  stopped: boolean
}

type SegCacheEntry = {
  input: string
  sentences: string[]
  touched: number
}

const MAX_SEG_CACHE = 256
const KEEP_FINISHED_MESSAGES = 12

const hasLetters = (input: string) => {
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i)
    if (ch.toLowerCase() !== ch.toUpperCase()) return true
  }
  return false
}

const isSentencePunct = (ch: string) =>
  ch === '.' ||
  ch === '!' ||
  ch === '?' ||
  ch === '。' ||
  ch === '！' ||
  ch === '？'

const normalizeBoundaries = (text: string): string => {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i)
    out += ch
    if (isSentencePunct(ch)) {
      const next = text.charAt(i + 1)
      if (next && next !== ' ' && hasLetters(next)) {
        out += ' '
      }
    }
  }
  return out
}

const splitSentencesFast = (raw: string): string[] => {
  const normalized = normalizeBoundaries(raw.replace(/\s+/g, ' ').trim())
  if (!normalized) return []
  const parts = normalized.split(/(?<=[.!?])\s+(?=[^\s])/g)
  const filtered: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    if (part && hasLetters(part)) filtered.push(part)
  }
  return filtered
}

const getIncrementalSentences = (
  prev: SegCacheEntry | undefined,
  nextInput: string,
  now: number,
): SegCacheEntry => {
  if (!prev) {
    return {
      input: nextInput,
      sentences: splitSentencesFast(nextInput),
      touched: now,
    }
  }

  if (nextInput === prev.input) {
    return { input: prev.input, sentences: prev.sentences, touched: now }
  }

  if (nextInput.startsWith(prev.input)) {
    const prevSentences = prev.sentences
    const prevLast = prevSentences[prevSentences.length - 1] || ''
    const baseLen = prev.input.length - prevLast.length

    if (baseLen >= 0 && prev.input.slice(baseLen) === prevLast) {
      const tail = nextInput.slice(baseLen)
      const tailSegments = splitSentencesFast(tail)
      const merged =
        prevSentences.length > 0
          ? prevSentences.slice(0, -1).concat(tailSegments)
          : tailSegments
      return { input: nextInput, sentences: merged, touched: now }
    }
  }

  return {
    input: nextInput,
    sentences: splitSentencesFast(nextInput),
    touched: now,
  }
}

const getPerformanceNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()

export const useDefaultPlay = ({
  enabled,
  fullSentenceRegex,
  onEnd,
  superinterfaceContext,
  isAudioPlayed,
}: {
  enabled: boolean
  fullSentenceRegex: RegExp
  onEnd: () => void
  superinterfaceContext: {
    baseUrl: string
    variables: Record<string, string>
  }
  isAudioPlayed: boolean
}) => {
  const audioPlayer = useAudioPlayer()
  const nextAudioPlayer = useAudioPlayer()

  const [isPlaying, setIsPlaying] = useState(false)
  const [audioQueue, setAudioQueue] = useState<AudioMessageState[]>([])
  const audioQueueRef = useRef<AudioMessageState[]>(audioQueue)
  useEffect(() => {
    audioQueueRef.current = audioQueue
  }, [audioQueue])

  const messageStatesRef = useRef<Map<string, AudioMessageState>>(new Map())
  const segCacheRef = useRef<Map<string, SegCacheEntry>>(new Map())
  const chunkQueuesRef = useRef<Map<string, ChunkState[]>>(new Map())
  const messageOrderRef = useRef<Map<string, number>>(new Map())
  const pickLockRef = useRef(false)
  const currentSentenceRef = useRef<{
    messageId: string
    index: number
  } | null>(null)
  const currentChunkRef = useRef<{
    messageId: string
    chunk: ChunkState | null
  } | null>(null)

  const evictSegCache = useCallback(() => {
    const segCache = segCacheRef.current
    if (segCache.size <= MAX_SEG_CACHE) return
    const entries = Array.from(segCache.entries())
    entries.sort((a, b) => a[1].touched - b[1].touched)
    const toRemove = segCache.size - MAX_SEG_CACHE
    for (let i = 0; i < toRemove; i++) segCache.delete(entries[i][0])
  }, [])

  const getOrder = useCallback((state: AudioMessageState) => {
    const explicit = messageOrderRef.current.get(state.id)
    if (explicit != null) return explicit
    return state.order
  }, [])

  const rebuildQueue = useCallback(() => {
    if (!enabled) return
    const states = Array.from(messageStatesRef.current.values())
    states.sort((a, b) => getOrder(a) - getOrder(b))

    const unfinished: AudioMessageState[] = []
    const finished: AudioMessageState[] = []

    for (let i = 0; i < states.length; i++) {
      const state = states[i]
      if (
        !state.stopped &&
        (state.status === 'in_progress' ||
          state.nextIndex < state.sentences.length)
      ) {
        unfinished.push(state)
      } else {
        finished.push(state)
      }
    }

    if (finished.length > KEEP_FINISHED_MESSAGES) {
      const toTrim = finished.length - KEEP_FINISHED_MESSAGES
      for (let i = 0; i < toTrim; i++) {
        const removed = finished.shift()
        if (!removed) break
        messageStatesRef.current.delete(removed.id)
        segCacheRef.current.delete(removed.id)
        chunkQueuesRef.current.delete(removed.id)
      }
    }

    const combined = [...unfinished, ...finished]
    audioQueueRef.current = combined
    setAudioQueue((prev) => {
      if (prev.length === combined.length) {
        let identical = true
        for (let i = 0; i < prev.length; i++) {
          if (prev[i] !== combined[i]) {
            identical = false
            break
          }
        }
        if (identical) return prev
      }
      return combined
    })
  }, [enabled, getOrder])

  const checkForCompletion = useCallback(() => {
    if (!enabled) return
    const hasPending = Array.from(messageStatesRef.current.values()).some(
      (state) => {
        if (state.stopped) return false
        const hasMore = state.nextIndex < state.sentences.length
        const streaming = state.status === 'in_progress'
        return hasMore || streaming
      },
    )
    if (!hasPending) onEnd()
  }, [enabled, onEnd])

  const finishChunk = useCallback(
    (messageId: string, reason: 'end' | 'stop') => {
      if (!enabled) return
      const queues = chunkQueuesRef.current
      const queue = queues.get(messageId)
      if (!queue || queue.length === 0) return
      const chunk = queue[0]

      if (reason === 'stop') {
        if (!chunk.stopped) {
          chunk.stopped = true
          chunk.onStop()
        }
        queue.shift()
        if (queue.length === 0) queues.delete(messageId)
        return
      }

      chunk.remaining -= 1
      if (chunk.remaining <= 0) {
        chunk.onEnd()
        queue.shift()
        if (queue.length === 0) queues.delete(messageId)
      }
    },
    [enabled],
  )

  const startNextSegment = useCallback(() => {
    if (!enabled) return
    if (isPlaying) return
    if (audioPlayer.playing) return
    if (pickLockRef.current) return

    const queueSnapshot = audioQueueRef.current.slice()
    queueSnapshot.sort((a, b) => getOrder(a) - getOrder(b))

    let candidate: {
      messageId: string
      sentence: string
      index: number
      status: AudioMessageState['status']
    } | null = null

    for (let i = 0; i < queueSnapshot.length; i++) {
      const state = queueSnapshot[i]
      if (state.stopped) continue

      const sentence = state.sentences[state.nextIndex]
      if (!sentence) continue

      const isFull =
        isOptimistic({ id: state.id }) ||
        state.status !== 'in_progress' ||
        fullSentenceRegex.test(sentence)

      if (!isFull) continue

      candidate = {
        messageId: state.id,
        sentence,
        index: state.nextIndex,
        status: state.status,
      }
      break
    }

    if (!candidate) return

    pickLockRef.current = true
    setIsPlaying(true)
    currentSentenceRef.current = {
      messageId: candidate.messageId,
      index: candidate.index,
    }

    const state = messageStatesRef.current.get(candidate.messageId)
    if (!state) {
      pickLockRef.current = false
      setIsPlaying(false)
      currentSentenceRef.current = null
      return
    }
    state.nextIndex = candidate.index + 1
    rebuildQueue()

    const chunkQueue = chunkQueuesRef.current.get(candidate.messageId)
    const activeChunk =
      chunkQueue && chunkQueue.length > 0 ? chunkQueue[0] : null
    currentChunkRef.current = activeChunk

    const searchParams = new URLSearchParams({
      input: candidate.sentence,
      ...superinterfaceContext.variables,
    })

    audioPlayer.load(
      `${superinterfaceContext.baseUrl}/audio-runtimes/tts?${searchParams}`,
      {
        format: 'mp3',
        autoplay: isAudioPlayed,
        html5: isHtmlAudioSupported,
        onplay: () => {
          if (activeChunk && !activeChunk.started) {
            activeChunk.started = true
            activeChunk.onPlay()
          }
        },
        onstop: () => {
          const stateToUpdate = messageStatesRef.current.get(
            candidate!.messageId,
          )
          if (stateToUpdate) {
            stateToUpdate.stopped = true
          }
          finishChunk(candidate!.messageId, 'stop')
          setIsPlaying(false)
          currentSentenceRef.current = null
          currentChunkRef.current = null
          pickLockRef.current = false
          rebuildQueue()
          checkForCompletion()
        },
        onload: () => {
          const current = currentSentenceRef.current
          if (!current) return
          const owner = messageStatesRef.current.get(current.messageId)
          if (!owner) return
          const nextSentence = owner.sentences[owner.nextIndex]
          if (!nextSentence) return
          const allowQueued =
            owner.status !== 'in_progress' ||
            isOptimistic({ id: owner.id }) ||
            fullSentenceRegex.test(nextSentence)
          if (!allowQueued) return

          const nextSearchParams = new URLSearchParams({
            input: nextSentence,
            ...superinterfaceContext.variables,
          })

          nextAudioPlayer.load(
            `${superinterfaceContext.baseUrl}/audio-runtimes/tts?${nextSearchParams}`,
            { format: 'mp3', autoplay: false, html5: isHtmlAudioSupported },
          )
        },
        onend: () => {
          finishChunk(candidate!.messageId, 'end')
          setIsPlaying(false)
          currentSentenceRef.current = null
          currentChunkRef.current = null
          pickLockRef.current = false
          rebuildQueue()
          checkForCompletion()
          startNextSegment()
        },
      },
    )
  }, [
    enabled,
    isPlaying,
    audioPlayer,
    fullSentenceRegex,
    superinterfaceContext,
    isAudioPlayed,
    rebuildQueue,
    finishChunk,
    checkForCompletion,
    getOrder,
  ])

  const play = useCallback(
    ({
      input,
      message,
      onPlay,
      onStop,
      onEnd: chunkOnEnd,
    }: DefaultPlayArgs) => {
      if (!enabled) {
        chunkOnEnd()
        return
      }

      const fullInput = getInput({ message })
      if (fullInput == null) {
        chunkOnEnd()
        return
      }

      const id = String(message.id)
      const now = getPerformanceNow()
      const segCache = segCacheRef.current
      const prevSeg = segCache.get(id)
      const nextSeg = getIncrementalSentences(prevSeg, fullInput, now)
      segCache.set(id, nextSeg)
      evictSegCache()

      const existing = messageStatesRef.current.get(id)
      const prevPlayable = existing?.playableCount ?? 0

      const sentences = nextSeg.sentences
      let playableCount = sentences.length
      if (
        !isOptimistic({ id }) &&
        message.status === 'in_progress' &&
        sentences.length > 0
      ) {
        const last = sentences[sentences.length - 1]
        if (last && !fullSentenceRegex.test(last)) {
          playableCount -= 1
        }
      }
      if (playableCount < 0) playableCount = 0

      const fallbackOrder =
        existing?.fallbackOrder ?? message.created_at ?? Date.now()
      const order =
        messageOrderRef.current.get(id) ?? existing?.order ?? fallbackOrder

      const nextIndex = existing
        ? Math.min(existing.nextIndex, sentences.length)
        : 0
      const stopped = existing?.stopped ?? false

      const nextState: AudioMessageState = {
        id,
        status: (message.status as AudioMessageState['status']) ?? 'completed',
        sentences,
        nextIndex,
        playableCount,
        stopped,
        order,
        fallbackOrder,
      }

      messageStatesRef.current.set(id, nextState)
      rebuildQueue()

      const newSegments = Math.max(playableCount - prevPlayable, 0)

      if (newSegments > 0) {
        const queue = chunkQueuesRef.current.get(id) ?? []
        queue.push({
          remaining: newSegments,
          onPlay,
          onStop,
          onEnd: chunkOnEnd,
          started: false,
          stopped: false,
        })
        chunkQueuesRef.current.set(id, queue)
        startNextSegment()
      } else {
        chunkOnEnd()
      }
    },
    [enabled, fullSentenceRegex, rebuildQueue, startNextSegment, evictSegCache],
  )

  const syncMessages = useCallback(
    (messagesAsc: SerializedMessage[]) => {
      messageOrderRef.current.clear()
      for (let i = 0; i < messagesAsc.length; i++) {
        messageOrderRef.current.set(String(messagesAsc[i].id), i)
        const state = messageStatesRef.current.get(String(messagesAsc[i].id))
        if (state)
          state.status = (messagesAsc[i].status as string) ?? 'completed'
      }

      if (!enabled) return
      rebuildQueue()
    },
    [enabled, rebuildQueue],
  )

  useEffect(() => {
    if (!enabled) return
    if (isHtmlAudioSupported) {
      // @ts-ignore-next-line
      const node = Howler?._howls?.[0]?._sounds?.[0]?._node
      if (node) node.crossOrigin = 'anonymous'
    }
  }, [enabled, audioPlayer])

  const [audioEngine, setAudioEngine] = useState<{
    source: AudioNode
    audioContext: AudioContext
  } | null>(null)
  const isAudioEngineInited = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (!audioPlayer.playing) return
    if (isAudioEngineInited.current) return
    isAudioEngineInited.current = true

    if (isHtmlAudioSupported) {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioCtx()
      // @ts-ignore-next-line
      const node = Howler?._howls?.[0]?._sounds?.[0]?._node
      if (node) {
        setAudioEngine({
          // @ts-ignore-next-line
          source: audioContext.createMediaElementSource(node),
          audioContext,
        })
      }
    } else {
      setAudioEngine({
        source: (Howler as any).masterGain,
        audioContext: (Howler as any).ctx,
      })
    }
  }, [enabled, audioPlayer])

  const visualizationAnalyser = useMemo(() => {
    if (!enabled) return null
    if (!audioEngine) return null
    const analyser = audioEngine.audioContext.createAnalyser()
    audioEngine.source.connect(audioEngine.audioContext.destination)
    audioEngine.source.connect(analyser)
    return analyser
  }, [enabled, audioEngine])

  const isPending = useMemo(() => {
    if (!enabled) return false
    return (
      isPlaying ||
      Array.from(messageStatesRef.current.values()).some(
        (state) =>
          !state.stopped &&
          (state.status === 'in_progress' ||
            state.nextIndex < state.sentences.length),
      )
    )
  }, [enabled, isPlaying])

  return {
    play,
    syncMessages,
    isPending,
    visualizationAnalyser,
    controls: audioPlayer,
  }
}
