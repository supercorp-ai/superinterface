'use client'

import 'regenerator-runtime/runtime'
import { useCallback, useEffect, useRef } from 'react'
import { Flex } from '@radix-ui/themes'
import _ from 'lodash'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import { useThreadLifecycles } from '@/hooks/threads/useThreadLifecycles'
import { useCreateThreadMessage } from '@/hooks/threadMessages/useCreateThreadMessage'
import { usePermission } from 'react-use'
import { blobToData } from './lib/blobToData'
import { useStatus } from '@/hooks/audioThreads/useStatus'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import { useMessageAudio } from '@/hooks/audioThreads/useMessageAudio'

export type Args = {
  children: React.ReactNode
}

export const Root = ({
  children,
}: Args) => {
  useThreadLifecycles()

  const createThreadMessageProps = useCreateThreadMessage()

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    ...rest
  } = useSpeechRecognition()

  const transcriptRef = useRef(transcript)

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  const recorderProps = useRecorder({
    isStopOnSilence: true,
    onStart: async () => {
      console.log('start')
      resetTranscript()
      // @ts-ignore-next-line
      SpeechRecognition.default.startListening({ continuous: true })
    },
    onStop: async (_event: any, chunks: BlobPart[]) => {
      console.log({ transcript: transcriptRef.current })
      return createThreadMessageProps.createThreadMessage({
        content: transcriptRef.current,
      })
      // // @ts-ignore-next-line
      // const blob = new Blob(chunks, { type: chunks[0].type })
      // const audioContent = await blobToData(blob)
      //
      // return createThreadMessageProps.createThreadMessage({
      //   audioContent,
      // })
    },
  })

  const microphonePermission = usePermission({ name: 'microphone' })

  const messageAudioProps = useMessageAudio({
    onEnd: () => {
      if (microphonePermission === 'granted') {
        recorderProps.start()
      }
    }
  })

  const { status } = useStatus({
    recorderProps,
    createThreadMessageProps,
    messageAudioProps,
  })

  return (
    <AudioThreadContext.Provider
      value={{
        status,
        recorderProps,
        messageAudioProps,
      }}
    >
      <Flex
        direction="column"
        grow="1"
        p="5"
      >
        {children}
      </Flex>
    </AudioThreadContext.Provider>
  )
}
