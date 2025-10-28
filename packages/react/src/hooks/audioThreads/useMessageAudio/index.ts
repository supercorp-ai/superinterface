import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DefaultAudioSegment, PlayArgs, SerializedMessage } from '@/types'
import { useMessages } from '@/hooks/messages/useMessages'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { input as getInput } from './lib/input'
import { useDefaultPlay } from './lib/useDefaultPlay'

type ProcessedMessageState = {
  text: string
  status?: SerializedMessage['status']
}

export const useMessageAudio = <TInput = DefaultAudioSegment>({
  onEnd,
  play: passedPlay,
  fullSentenceRegex = /[\.?!]$/,
}: {
  onEnd: () => void
  play?: (args: PlayArgs<TInput>) => Promise<void> | void
  fullSentenceRegex?: RegExp
}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const messagesProps = useMessages()

  const assistantsAsc = useMemo(() => {
    const assistantsDesc = messagesProps.messages.filter(
      (message: SerializedMessage) => message.role === 'assistant',
    )
    return assistantsDesc.slice().reverse() as SerializedMessage[]
  }, [messagesProps.messages])

  const [isAudioPlayed, setIsAudioPlayed] = useState(false)

  const [activeChunks, setActiveChunks] = useState(0)
  const activeChunksRef = useRef(0)
  useEffect(() => {
    activeChunksRef.current = activeChunks
  }, [activeChunks])

  const onEndPendingRef = useRef(false)

  const defaultPlayback = useDefaultPlay({
    enabled: !passedPlay,
    fullSentenceRegex,
    onEnd,
    superinterfaceContext,
    isAudioPlayed,
  })

  const {
    play: defaultPlayFn,
    syncMessages,
    isPending: defaultIsPending,
    visualizationAnalyser: defaultVisualizer,
    controls,
  } = defaultPlayback

  const playImpl = useMemo(
    () => passedPlay || (defaultPlayFn as (args: PlayArgs<TInput>) => void),
    [passedPlay, defaultPlayFn],
  )

  const createChunkCallbacks = useCallback(() => {
    if (passedPlay) {
      onEndPendingRef.current = true
      setActiveChunks((prev) => prev + 1)
    }
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      if (passedPlay) {
        setActiveChunks((prev) => Math.max(prev - 1, 0))
      }
    }
    return {
      onPlay: () => setIsAudioPlayed(true),
      onStop: () => finish(),
      onEnd: () => finish(),
    }
  }, [passedPlay])

  const processedRef = useRef<Map<string, ProcessedMessageState>>(new Map())

  useEffect(() => {
    const seenIds = new Set<string>()

    for (let idx = 0; idx < assistantsAsc.length; idx++) {
      const message = assistantsAsc[idx]
      const id = String(message.id)
      const input = getInput({ message })
      if (input == null) continue

      const prev = processedRef.current.get(id)
      const prevText = prev?.text ?? ''
      const prevStatus = prev?.status

      const hasSamePrefix =
        prevText.length > 0 && input.startsWith(prevText) && prevText !== input

      let delta: string
      if (hasSamePrefix) {
        delta = input.slice(prevText.length)
      } else if (input === prevText) {
        delta = ''
      } else {
        delta = input
      }

      const statusChanged = prevStatus !== message.status

      if (delta.length > 0 || statusChanged) {
        const callbacks = createChunkCallbacks()
        try {
          playImpl({
            input: delta as unknown as TInput,
            message,
            onPlay: callbacks.onPlay,
            onStop: callbacks.onStop,
            onEnd: callbacks.onEnd,
          })
        } catch (error) {
          callbacks.onEnd()
          throw error
        }
      }

      processedRef.current.set(id, { text: input, status: message.status })
      seenIds.add(id)
    }

    for (const id of Array.from(processedRef.current.keys())) {
      if (!seenIds.has(id)) {
        processedRef.current.delete(id)
      }
    }

    if (!passedPlay) {
      syncMessages(assistantsAsc)
    }
  }, [assistantsAsc, playImpl, passedPlay, createChunkCallbacks, syncMessages])

  useEffect(() => {
    if (!passedPlay) return
    if (!onEndPendingRef.current) return
    if (activeChunksRef.current !== 0) return

    const hasStreaming = assistantsAsc.some(
      (message) => message.status === 'in_progress',
    )

    if (!hasStreaming) {
      onEnd()
      onEndPendingRef.current = false
    }
  }, [passedPlay, assistantsAsc, onEnd, activeChunks])

  const isPending = passedPlay
    ? activeChunks > 0 ||
      assistantsAsc.some((message) => message.status === 'in_progress')
    : defaultIsPending

  const visualizationAnalyser = passedPlay ? null : defaultVisualizer

  return {
    isPending,
    isAudioPlayed,
    ...controls,
    visualizationAnalyser,
  }
}
