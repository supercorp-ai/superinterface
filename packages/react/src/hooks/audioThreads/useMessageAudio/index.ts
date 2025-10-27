import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useMessages } from '@/hooks/messages/useMessages'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import {
  AudioEngine,
  type DefaultAudioSegment,
  type PlayArgs,
  type PlaySegmentsArgs,
  type SerializedMessage,
  type MessageAudioOverrides,
} from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

/** Tunables for perf + memory */
const THROTTLE_MS = 80 // don't mirror more often than this
const MAX_SEG_CACHE = 256 // LRU entries for sentence cache
const KEEP_FINISHED_MESSAGES = 12 // keep this many fully-spoken msgs in queue
const FULL_SENTENCE_REGEX = /[\.?!]$/

/** ES5-safe: detect presence of letters in any script (no \p{L}/u) */
const hasLetters = (s: string): boolean => {
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i)
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

/** Ensure a space after sentence punctuation when followed by a letter; avoids "now.Perfect!" merging. */
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

/** very fast, GC-friendly splitter; returns ONLY sentences with letters */
const splitSentencesFast = (raw: string): string[] => {
  const t = normalizeBoundaries(raw.replace(/\s+/g, ' ').trim())
  if (!t) return []
  const parts = t.split(/(?<=[.!?])\s+(?=[^\s])/g)
  const filtered: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim()
    if (p && hasLetters(p)) filtered.push(p)
  }
  return filtered
}

type AudioMessage<TSegment> = {
  id: string
  status: 'in_progress' | string
  segments: TSegment[]
  nextIndex: number
  stopped: boolean
  messageInput: string
}

type SegCacheEntry<TSegment> = {
  input: string
  segments: TSegment[]
  touched: number
}

const getIncrementalSegments = (
  prev: SegCacheEntry<string> | undefined,
  nextInput: string,
  now: number,
): SegCacheEntry<string> => {
  if (!prev)
    return {
      input: nextInput,
      segments: splitSentencesFast(nextInput),
      touched: now,
    }
  if (nextInput === prev.input)
    return { input: prev.input, segments: prev.segments, touched: now }

  if (nextInput.startsWith(prev.input)) {
    const prevSegments = prev.segments
    const prevLast = prevSegments[prevSegments.length - 1] || ''
    const baseLen = prev.input.length - prevLast.length

    if (baseLen >= 0 && prev.input.slice(baseLen) === prevLast) {
      const tail = nextInput.slice(baseLen)
      const tailSegments = splitSentencesFast(tail)
      const merged =
        prevSegments.length > 0
          ? prevSegments.slice(0, -1).concat(tailSegments)
          : tailSegments
      return { input: nextInput, segments: merged, touched: now }
    }
  }

  return {
    input: nextInput,
    segments: splitSentencesFast(nextInput),
    touched: now,
  }
}

const getDefaultSegments = (
  prev: SegCacheEntry<string> | undefined,
  input: string,
  message: SerializedMessage,
  nowTs: number,
) => {
  const base = getIncrementalSegments(prev, input, nowTs)

  const fullSegments = base.segments
  let readyCount = fullSegments.length
  if (
    readyCount > 0 &&
    !isOptimistic({ id: message.id }) &&
    message.status === 'in_progress'
  ) {
    const last = fullSegments[fullSegments.length - 1]
    if (last && !FULL_SENTENCE_REGEX.test(last)) readyCount -= 1
  }

  const readySegments = fullSegments.slice(0, Math.max(0, readyCount))
  const playable =
    readyCount === fullSegments.length ? fullSegments : readySegments

  return {
    entry: {
      input: base.input,
      segments: base.segments,
      touched: nowTs,
    },
    playable,
  }
}

type UseMessageAudioOptions<TSegment> = {
  onEnd: () => void
} & MessageAudioOverrides<TSegment>

const segmentsEqual = <TSegment>(a: TSegment[], b: TSegment[]): boolean => {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export const useMessageAudio = <TSegment = DefaultAudioSegment>({
  onEnd,
  play: providedPlay,
  playSegments: providedPlaySegments,
  getSegments: providedGetSegments,
}: UseMessageAudioOptions<TSegment>) => {
  const [isAudioPlayed, setIsAudioPlayed] = useState(false)
  const isAudioPlayedRef = useRef(false)
  const audioPlayer = useAudioPlayer()
  const nextAudioPlayer = useAudioPlayer()
  const superinterfaceContext = useSuperinterfaceContext()
  const [isPlaying, setIsPlaying] = useState(false)

  const [audioQueue, setAudioQueue] = useState<AudioMessage<TSegment>[]>([])
  const audioQueueRef = useRef<AudioMessage<TSegment>[]>([])
  useEffect(() => {
    audioQueueRef.current = audioQueue
  }, [audioQueue])

  const pickLockRef = useRef(false)
  const activeSegmentsRef = useRef(0)
  const currentSegmentRef = useRef<{
    messageId: string
    nextIndex: number
  } | null>(null)
  const onEndPendingRef = useRef(false)

  const messagesProps = useMessages()
  const messagesByIdRef = useRef<Map<string, SerializedMessage>>(new Map())
  const segCacheRef = useRef<Map<string, SegCacheEntry<any>>>(new Map())

  const mirrorTimerRef = useRef<number | null>(null)
  const pendingMirrorRef = useRef(false)

  const markAudioPlayed = useCallback(() => {
    if (!isAudioPlayedRef.current) {
      isAudioPlayedRef.current = true
      setIsAudioPlayed(true)
    }
  }, [])

  const checkForCompletion = useCallback(() => {
    if (activeSegmentsRef.current > 0) return
    const hasPending = audioQueueRef.current.some(
      (m) =>
        !m.stopped &&
        (m.nextIndex < m.segments.length || m.status === 'in_progress'),
    )
    if (hasPending) {
      onEndPendingRef.current = true
      return
    }
    if (!onEndPendingRef.current) return
    onEndPendingRef.current = false
    onEnd()
  }, [onEnd])

  useEffect(() => {
    if (mirrorTimerRef.current != null) {
      pendingMirrorRef.current = true
      return
    }

    const run = async () => {
      const assistantsDesc = messagesProps.messages.filter(
        (m: any) => m.role === 'assistant',
      )
      const assistantsAsc = assistantsDesc.slice().reverse()
      const nowTs =
        typeof performance !== 'undefined' && performance.now
          ? performance.now()
          : Date.now()

      const lastNIds = new Set(
        assistantsAsc
          .slice(Math.max(0, assistantsAsc.length - KEEP_FINISHED_MESSAGES))
          .map((m: any) => String(m.id)),
      )

      const prevQueue = audioQueueRef.current
      const prevById = new Map(prevQueue.map((p) => [p.id, p]))

      const prevUnfinishedIds = new Set(
        prevQueue
          .filter(
            (m) =>
              !m.stopped &&
              (m.status === 'in_progress' || m.nextIndex < m.segments.length),
          )
          .map((m) => m.id),
      )

      const streamingIds = new Set(
        assistantsAsc
          .filter((m: any) => m.status === 'in_progress')
          .map((m: any) => String(m.id)),
      )

      const includeIds = new Set<string>()
      lastNIds.forEach((id) => includeIds.add(id))
      prevUnfinishedIds.forEach((id) => includeIds.add(id))
      streamingIds.forEach((id) => includeIds.add(id))

      const segCache = segCacheRef.current
      const nextQueue: AudioMessage<TSegment>[] = []
      let changed = false

      const touch = (id: string, entry: SegCacheEntry<TSegment>) => {
        segCache.set(id, {
          input: entry.input,
          segments: entry.segments,
          touched: nowTs,
        })
      }

      for (let i = 0; i < assistantsAsc.length; i++) {
        const m = assistantsAsc[i] as SerializedMessage
        if (!includeIds.has(String(m.id))) continue

        const input = getInput({ message: m })
        if (input == null) {
          segCache.delete(m.id)
          messagesByIdRef.current.delete(m.id)
          continue
        }

        messagesByIdRef.current.set(m.id, m)

        const prevEntry = segCache.get(m.id) as SegCacheEntry<any> | undefined
        let nextEntry: SegCacheEntry<any>
        let playableSegments: TSegment[]

        if (providedGetSegments) {
          const customSegments = await Promise.resolve(
            providedGetSegments({ message: m, input }),
          )
          const safeSegments = Array.isArray(customSegments)
            ? (customSegments as TSegment[])
            : []
          nextEntry = {
            input,
            segments: safeSegments,
            touched: nowTs,
          }
          playableSegments = safeSegments
        } else {
          const { entry, playable } = getDefaultSegments(
            prevEntry as SegCacheEntry<string> | undefined,
            input,
            m,
            nowTs,
          )
          nextEntry = entry as SegCacheEntry<any>
          playableSegments = playable as unknown as TSegment[]
        }

        touch(m.id, nextEntry)

        const existing = prevById.get(m.id)
        const nextIndex = Math.min(
          existing?.nextIndex ?? 0,
          playableSegments.length,
        )
        const stopped = existing?.stopped ?? false

        const reuse =
          !!existing &&
          existing.status === m.status &&
          existing.messageInput === input &&
          existing.nextIndex === nextIndex &&
          existing.stopped === stopped &&
          segmentsEqual(existing.segments, playableSegments)

        if (reuse) {
          nextQueue.push(existing)
        } else {
          nextQueue.push({
            id: m.id,
            status: m.status,
            segments: playableSegments,
            nextIndex,
            stopped,
            messageInput: input,
          })
          changed = true
        }
      }

      const unfinished = nextQueue.filter(
        (m) =>
          !m.stopped &&
          (m.status === 'in_progress' || m.nextIndex < m.segments.length),
      )
      const finished = nextQueue.filter(
        (m) =>
          !(
            !m.stopped &&
            (m.status === 'in_progress' || m.nextIndex < m.segments.length)
          ),
      )
      const prunedFinished =
        finished.length > KEEP_FINISHED_MESSAGES
          ? finished.slice(finished.length - KEEP_FINISHED_MESSAGES)
          : finished

      const combined = [...unfinished, ...prunedFinished]

      if (
        combined.some(
          (m) =>
            !m.stopped &&
            (m.nextIndex < m.segments.length || m.status === 'in_progress'),
        )
      ) {
        onEndPendingRef.current = true
      }

      if (!changed) {
        if (combined.length !== prevQueue.length) {
          changed = true
        } else {
          for (let i = 0; i < combined.length; i++) {
            if (combined[i] !== prevQueue[i]) {
              changed = true
              break
            }
          }
        }
      }

      const idsInQueue = new Set(combined.map((m) => m.id))
      for (const id of Array.from(segCache.keys())) {
        if (!idsInQueue.has(id)) segCache.delete(id)
      }
      for (const id of Array.from(messagesByIdRef.current.keys())) {
        if (!idsInQueue.has(id)) messagesByIdRef.current.delete(id)
      }

      if (changed) setAudioQueue(combined)

      if (segCache.size > MAX_SEG_CACHE) {
        const entries = Array.from(segCache.entries())
        entries.sort((a, b) => a[1].touched - b[1].touched)
        const toRemove = segCache.size - MAX_SEG_CACHE
        for (let i = 0; i < toRemove; i++) segCache.delete(entries[i][0])
      }
    }

    const schedule = () => {
      mirrorTimerRef.current = window.setTimeout(async () => {
        mirrorTimerRef.current = null
        try {
          await run()
        } finally {
          if (pendingMirrorRef.current) {
            pendingMirrorRef.current = false
            schedule()
          }
        }
      }, THROTTLE_MS)
    }

    schedule()

    return () => {
      if (mirrorTimerRef.current != null) {
        clearTimeout(mirrorTimerRef.current)
        mirrorTimerRef.current = null
      }
      pendingMirrorRef.current = false
    }
  }, [messagesProps.messages, providedGetSegments])

  const defaultPlay = useCallback(
    async ({ input, onPlay, onStop, onEnd }: PlayArgs<string>) => {
      const searchParams = new URLSearchParams({
        input,
        ...superinterfaceContext.variables,
      })

      await new Promise<void>((resolve) => {
        let settled = false
        const settle = (cb: () => void) => {
          if (settled) return
          settled = true
          cb()
          resolve()
        }

        audioPlayer.load(
          `${superinterfaceContext.baseUrl}/audio-runtimes/tts?${searchParams}`,
          {
            format: 'mp3',
            autoplay: isAudioPlayedRef.current,
            html5: isHtmlAudioSupported,
            onplay: () => {
              markAudioPlayed()
              onPlay()
            },
            onstop: () => {
              settle(onStop)
            },
            onend: () => {
              settle(onEnd)
            },
            onload: () => {
              const current = currentSegmentRef.current
              if (!current) return

              const owner = audioQueueRef.current.find(
                (m) => m.id === current.messageId,
              )
              if (!owner) return

              const nextSegment = owner.segments[current.nextIndex] as
                | string
                | undefined
              if (!nextSegment) return

              const nextSearchParams = new URLSearchParams({
                input: nextSegment,
                ...superinterfaceContext.variables,
              })

              nextAudioPlayer.load(
                `${superinterfaceContext.baseUrl}/audio-runtimes/tts?${nextSearchParams}`,
                { format: 'mp3', autoplay: false, html5: isHtmlAudioSupported },
              )
            },
          },
        )
      })
    },
    [audioPlayer, nextAudioPlayer, superinterfaceContext, markAudioPlayed],
  )

  const playInternal = useCallback(
    async (segment: TSegment, handlers: Omit<PlayArgs<string>, 'input'>) => {
      if (providedPlay) {
        await Promise.resolve(
          providedPlay({
            input: segment,
            onPlay: () => {
              markAudioPlayed()
              handlers.onPlay()
            },
            onStop: handlers.onStop,
            onEnd: handlers.onEnd,
          } as PlayArgs<TSegment>),
        )
        return
      }

      await defaultPlay({
        input: segment as unknown as string,
        onPlay: handlers.onPlay,
        onStop: handlers.onStop,
        onEnd: handlers.onEnd,
      })
    },
    [providedPlay, defaultPlay, markAudioPlayed],
  )

  const defaultPlaySegments = useCallback(
    async ({ segments, message, play }: PlaySegmentsArgs<TSegment>) => {
      for (let i = 0; i < segments.length; i++) {
        await play(segments[i])
        const current = audioQueueRef.current.find((m) => m.id === message.id)
        if (!current || current.stopped) break
      }
    },
    [],
  )

  const playSegmentsImpl = useCallback(
    async (args: PlaySegmentsArgs<TSegment>) => {
      if (providedPlaySegments) {
        await Promise.resolve(providedPlaySegments(args))
        return
      }

      await defaultPlaySegments(args)
    },
    [providedPlaySegments, defaultPlaySegments],
  )

  const handleStop = useCallback(
    (messageId: string) => {
      setAudioQueue((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, stopped: true } : m)),
      )
      activeSegmentsRef.current = 0
      setIsPlaying(false)
      currentSegmentRef.current = null
      pickLockRef.current = false
      checkForCompletion()
    },
    [checkForCompletion],
  )

  const handleSegmentEnd = useCallback(() => {
    if (activeSegmentsRef.current > 0) activeSegmentsRef.current -= 1
    if (activeSegmentsRef.current === 0) {
      setIsPlaying(false)
      currentSegmentRef.current = null
      pickLockRef.current = false
      checkForCompletion()
    }
  }, [checkForCompletion])

  useEffect(() => {
    if (isPlaying) return
    if (pickLockRef.current) return
    if (audioQueue.length === 0) return

    let candidate: {
      messageId: string
      message: SerializedMessage
      messageInput: string
      startIndex: number
      segments: TSegment[]
    } | null = null

    for (let i = 0; i < audioQueue.length; i++) {
      const msg = audioQueue[i]
      if (msg.stopped) continue
      if (msg.nextIndex >= msg.segments.length) continue
      const message = messagesByIdRef.current.get(msg.id)
      if (!message) continue
      candidate = {
        messageId: msg.id,
        message,
        messageInput: msg.messageInput,
        startIndex: msg.nextIndex,
        segments: msg.segments.slice(msg.nextIndex),
      }
      break
    }

    if (!candidate || candidate.segments.length === 0) return

    pickLockRef.current = true
    setIsPlaying(true)

    setAudioQueue((prev) =>
      prev.map((m) =>
        m.id === candidate!.messageId
          ? { ...m, nextIndex: m.segments.length }
          : m,
      ),
    )

    const runPlayback = async () => {
      let nextIndex = candidate!.startIndex
      try {
        await playSegmentsImpl({
          segments: candidate!.segments,
          startIndex: candidate!.startIndex,
          message: candidate!.message,
          play: async (segment) => {
            activeSegmentsRef.current += 1
            nextIndex += 1
            currentSegmentRef.current = {
              messageId: candidate!.messageId,
              nextIndex,
            }
            await playInternal(segment, {
              onPlay: () => {},
              onStop: () => handleStop(candidate!.messageId),
              onEnd: () => handleSegmentEnd(),
            })
          },
        })
      } catch (error) {
        handleStop(candidate!.messageId)
        console.error(error)
      } finally {
        checkForCompletion()
      }
    }

    runPlayback()
  }, [
    audioQueue,
    isPlaying,
    playSegmentsImpl,
    playInternal,
    handleStop,
    handleSegmentEnd,
    checkForCompletion,
  ])

  useEffect(() => {
    if (isHtmlAudioSupported) {
      // @ts-ignore-next-line
      const node = Howler?._howls?.[0]?._sounds?.[0]?._node
      if (node) node.crossOrigin = 'anonymous'
    }
  }, [audioPlayer])

  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null)
  const isAudioEngineInited = useRef(false)

  useEffect(() => {
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
          (m.nextIndex < m.segments.length || m.status === 'in_progress'),
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
