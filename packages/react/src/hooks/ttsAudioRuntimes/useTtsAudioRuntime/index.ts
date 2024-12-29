import { useMemo } from 'react'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { usePermission } from '@/hooks/misc/usePermission'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import { useMessageAudio } from '@/hooks/audioThreads/useMessageAudio'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { useToasts } from '@/hooks/toasts/useToasts'
import { createMessageDefaultOnError } from '@/lib/errors/createMessageDefaultOnError'
import type { PlayArgs, AudioRuntime } from '@/types'
import { blobToData } from './blobToData'

export const useTtsAudioRuntime = ({
  play,
}: {
  play?: (args: PlayArgs) => void
}): { ttsAudioRuntime: AudioRuntime } => {
  const { addToast } = useToasts()
  const queryClient = useQueryClient()
  const threadContext = useThreadContext()

  const microphonePermission = usePermission({ name: 'microphone' })

  const createMessageProps = useCreateMessage({
    onError: (error: unknown) => {
      createMessageDefaultOnError({
        queryClient,
        addToast,
        threadContext,
      })(error)

      recorderProps.start()
    }
  })

  const recorderProps = useRecorder({
    isStopOnSilence: true,
    onStart: async () => {
    },
    onStop: async (_event: any, chunks: BlobPart[]) => {
      // @ts-ignore-next-line
      const blob = new Blob(chunks, { type: chunks[0].type })
      const audioContent = await blobToData(blob)

      return createMessageProps.createMessage({
        audioContent,
      })
    },
  })

  const messageAudioProps = useMessageAudio({
    play,
    onEnd: () => {
      if (microphonePermission === 'granted') {
        recorderProps.start()
      }
    }
  })

  return useMemo(() => ({
    ttsAudioRuntime: {
      user: {
        start: recorderProps.start,
        stop: recorderProps.stop,
        pause: recorderProps.pause,
        resume: recorderProps.resume,
        isPending: createMessageProps.isPending,
        visualizationAnalyser: recorderProps.visualizationAnalyser,
        rawStatus: recorderProps.status,
      },
      assistant: {
        play: messageAudioProps.play,
        pause: messageAudioProps.pause,
        stop: messageAudioProps.stop,
        visualizationAnalyser: messageAudioProps.visualizationAnalyser,
        playing: messageAudioProps.playing,
        paused: messageAudioProps.paused,
        isPending: messageAudioProps.isPending,
        isReady: messageAudioProps.isReady,
        isAudioPlayed: messageAudioProps.isAudioPlayed,
        rawStatus: undefined,
      },
    },
  }), [recorderProps, messageAudioProps, createMessageProps])
}
