import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Howler } from 'howler'
import { useAudioPlayer } from 'react-use-audio-player'
import { useMessages } from '@/hooks/messages/useMessages'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AudioEngine, type PlayArgs } from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'
import { input as getInput } from './lib/input'
import { isHtmlAudioSupported } from './lib/isHtmlAudioSupported'

/** Tunables for perf + memory */
const THROTTLE_MS = 80 // don't mirror more often than this
const MAX_SEG_CACHE = 256 // LRU entries for sentence cache
const KEEP_FINISHED_MESSAGES = 12 // keep this many fully-spoken msgs in queue

type AudioMessage = {
  id: string
  status: 'in_progress' | string
  sentences: string[]
  nextIndex: number
  stopped: boolean
}

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
  // normalize whitespace, then fix missing spaces after punctuation-before-letters
  const t = normalizeBoundaries(raw.replace(/\s+/g, ' ').trim())
  if (!t) return []
  // Split after ., !, ? followed by space. Keeps punctuation with the sentence.
  const parts = t.split(/(?<=[.!?])\s+(?=[^\s])/g)
  // Guarantee: queue holds only "speakable" sentences
  const filtered: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim()
    if (p && hasLetters(p)) filtered.push(p)
  }
  return filtered
}

/** Incremental segmentation cache entry with LRU timestamp */
type SegCacheEntry = { input: string; sentences: string[]; touched: number }

/** Only re-segment the tail when text appends; fallback to full when it mutates. */
const getIncrementalSentences = (
  prev: SegCacheEntry | undefined,
  nextInput: string,
  now: number,
): SegCacheEntry => {
  if (!prev)
    return {
      input: nextInput,
      sentences: splitSentencesFast(nextInput),
      touched: now,
    }
  if (nextInput === prev.input)
    return { input: prev.input, sentences: prev.sentences, touched: now }

  // Optimize append-only updates
  if (nextInput.startsWith(prev.input)) {
    const prevSentences = prev.sentences
    const prevLast = prevSentences[prevSentences.length - 1] || ''
    const baseLen = prev.input.length - prevLast.length

    if (baseLen >= 0 && prev.input.slice(baseLen) === prevLast) {
      // Re-segment the last sentence + appended tail together
      const tail = nextInput.slice(baseLen) // starts at prevLast
      const tailSegments = splitSentencesFast(tail)
      const merged =
        prevSentences.length > 0
          ? prevSentences.slice(0, -1).concat(tailSegments)
          : tailSegments
      return { input: nextInput, sentences: merged, touched: now }
    }
  }

  // Edits/insertions/rewrites: full re-seg
  return {
    input: nextInput,
    sentences: splitSentencesFast(nextInput),
    touched: now,
  }
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

  /** Single source of truth */
  const [audioQueue, setAudioQueue] = useState<AudioMessage[]>([])
  const audioQueueRef = useRef<AudioMessage[]>([])
  useEffect(() => {
    audioQueueRef.current = audioQueue
  }, [audioQueue])

  /** Prevents double-pick during rapid re-renders */
  const pickLockRef = useRef(false)
  const currentSentenceRef = useRef<{
    messageId: string
    index: number
  } | null>(null)

  /** Messages (DESC in your store) */
  const messagesProps = useMessages()

  /** Per-message incremental segmentation cache with LRU eviction */
  const segCacheRef = useRef<Map<string, SegCacheEntry>>(new Map())

  /** Throttle mirroring to avoid restream hitches */
  const mirrorTimerRef = useRef<number | null>(null)
  const pendingMirrorRef = useRef(false)

  useEffect(() => {
    if (mirrorTimerRef.current != null) {
      pendingMirrorRef.current = true
      return
    }

    const run = () => {
      const assistantsDesc = messagesProps.messages.filter(
        (m: any) => m.role === 'assistant',
      )
      const assistantsAsc = assistantsDesc.slice().reverse() // oldest -> newest
      const nowTs =
        typeof performance !== 'undefined' && performance.now
          ? performance.now()
          : Date.now()

      // ---- NEW: build an include window (last N finished) + always keep unfinished + any streaming
      const lastNIds = new Set(
        assistantsAsc
          .slice(Math.max(0, assistantsAsc.length - KEEP_FINISHED_MESSAGES))
          .map((m: any) => m.id),
      )

      setAudioQueue((prev) => {
        const prevById = new Map(prev.map((p) => [p.id, p]))

        const prevUnfinishedIds = new Set(
          prev
            .filter(
              (m) =>
                !m.stopped &&
                (m.status === 'in_progress' ||
                  m.nextIndex < m.sentences.length),
            )
            .map((m) => m.id),
        )

        // Include any message that is:
        // - in the recent window
        // - OR previously unfinished (was in the queue doing work)
        // - OR currently streaming (status in_progress), even if older than window
        const streamingIds = new Set(
          assistantsAsc
            .filter((m: any) => m.status === 'in_progress')
            .map((m: any) => m.id),
        )

        const includeIds = new Set<string>()
        lastNIds.forEach((id: any) => includeIds.add(String(id)))
        prevUnfinishedIds.forEach((id) => includeIds.add(id))
        streamingIds.forEach((id: any) => includeIds.add(String(id)))

        // LRU helpers (unchanged)
        const segCache = segCacheRef.current
        const touch = (id: string, entry: SegCacheEntry) => {
          segCache.set(id, {
            input: entry.input,
            sentences: entry.sentences,
            touched: nowTs,
          })
        }
        const evictLRU = () => {
          if (segCache.size <= MAX_SEG_CACHE) return
          const entries = Array.from(segCache.entries())
          entries.sort((a, b) => a[1].touched - b[1].touched)
          const toRemove = segCache.size - MAX_SEG_CACHE
          for (let i = 0; i < toRemove; i++) segCache.delete(entries[i][0])
        }

        const next: AudioMessage[] = []
        let changed = false

        // ---- Only iterate messages we decided to include
        for (let i = 0; i < assistantsAsc.length; i++) {
          const m: any = assistantsAsc[i]
          if (!includeIds.has(m.id)) continue

          const inp = getInput({ message: m })
          if (inp == null) continue

          const prevSeg = segCache.get(m.id)
          const nextSeg = getIncrementalSentences(prevSeg, inp, nowTs)
          if (
            !prevSeg ||
            nextSeg.input !== prevSeg.input ||
            nextSeg.sentences !== prevSeg.sentences
          ) {
            touch(m.id, nextSeg)
          } else {
            touch(m.id, prevSeg)
          }

          const existing = prevById.get(m.id)
          const sentences = nextSeg.sentences
          const nextIndex = Math.min(existing?.nextIndex ?? 0, sentences.length)
          const stopped = existing?.stopped ?? false

          const reuse =
            !!existing &&
            existing.status === m.status &&
            existing.sentences === sentences &&
            existing.nextIndex === nextIndex &&
            existing.stopped === stopped

          if (reuse) {
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

        // ---- pruning & eviction (unchanged)
        const unfinished = next.filter(
          (m) =>
            !m.stopped &&
            (m.status === 'in_progress' || m.nextIndex < m.sentences.length),
        )
        const finished = next.filter(
          (m) =>
            !(
              !m.stopped &&
              (m.status === 'in_progress' || m.nextIndex < m.sentences.length)
            ),
        )
        const prunedFinished =
          finished.length > KEEP_FINISHED_MESSAGES
            ? finished.slice(finished.length - KEEP_FINISHED_MESSAGES)
            : finished

        const combined = [...unfinished, ...prunedFinished]

        if (!changed) {
          if (combined.length !== prev.length) changed = true
          else {
            for (let i = 0; i < combined.length; i++) {
              if (combined[i] !== prev[i]) {
                changed = true
                break
              }
            }
          }
        }

        // evict seg-cache for messages no longer in queue
        const idsInQueue = new Set(combined.map((m) => m.id))
        for (const id of Array.from(segCache.keys())) {
          if (!idsInQueue.has(id)) segCache.delete(id)
        }
        evictLRU()

        return changed ? combined : prev
      })

      mirrorTimerRef.current = null
      if (pendingMirrorRef.current) {
        pendingMirrorRef.current = false
        mirrorTimerRef.current = window.setTimeout(run, THROTTLE_MS)
      }
    }

    mirrorTimerRef.current = window.setTimeout(run, THROTTLE_MS)

    // cleanup on unmount
    return () => {
      if (mirrorTimerRef.current != null) {
        clearTimeout(mirrorTimerRef.current)
        mirrorTimerRef.current = null
      }
      pendingMirrorRef.current = false
    }
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
          autoplay: isAudioPlayed,
          html5: isHtmlAudioSupported,
          onplay: onPlay,
          onstop: onStop,
          onload: () => {
            // Preload next from SAME message
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

  /** Pick earliest message with a playable sentence (sentences are already junk-free) */
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

    for (let mIdx = 0; mIdx < audioQueue.length; mIdx++) {
      const msg = audioQueue[mIdx]
      if (msg.stopped) continue

      const idx = msg.nextIndex
      const sentence = msg.sentences[idx]
      if (!sentence) continue

      const isFull =
        isOptimistic({ id: msg.id }) ||
        msg.status !== 'in_progress' ||
        fullSentenceRegex.test(sentence)

      if (isFull) {
        candidate = {
          messageId: msg.id,
          sentence,
          index: idx,
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

    // Commit progress (advance to next index after the chosen one)
    setAudioQueue((prev) =>
      prev.map((m) =>
        m.id === candidate!.messageId
          ? { ...m, nextIndex: candidate!.index + 1 }
          : m,
      ),
    )

    play({
      input: candidate.sentence,
      onPlay: () => setIsAudioPlayed(true),
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

        // If nothing pending, fire onEnd
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

  /** Cross-origin for HTML5 audio element */
  useEffect(() => {
    if (isHtmlAudioSupported) {
      // @ts-ignore-next-line
      const node = Howler?._howls?.[0]?._sounds?.[0]?._node
      if (node) node.crossOrigin = 'anonymous'
    }
  }, [audioPlayer])

  /** Visualizer wiring */
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
