'use client'

import 'regenerator-runtime/runtime'
import { useState } from 'react'
// import { useEffect, useRef } from 'react'
import { Flex } from '@radix-ui/themes'
import _ from 'lodash'
// import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { AudioStreamEvent } from '@/types'
import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { usePermission } from 'react-use'
import { blobToData } from './lib/blobToData'
import { useStatus } from '@/hooks/audioThreads/useStatus'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import { useMessageAudio } from '@/hooks/audioThreads/useMessageAudio'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'

export type Args = {
  children: React.ReactNode
}

export const Root = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [audioStreamEvents, setAudioStreamEvents] = useState<AudioStreamEvent[]>([])
  const audioThreadContext = useAudioThreadContext()

  return (
    <AudioThreadContext.Provider
      value={{
        ...audioThreadContext,
        audioStreamEvents,
        setAudioStreamEvents,
      }}
    >
      <InnerRoot>
        {children}
      </InnerRoot>
    </AudioThreadContext.Provider>
  )
}

const InnerRoot = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const createMessageProps = useCreateMessage()
  const audioThreadContext = useAudioThreadContext()

  // const {
  //   transcript,
  //   resetTranscript,
  // } = useSpeechRecognition()

  // const transcriptRef = useRef(transcript)
  //
  // useEffect(() => {
  //   transcriptRef.current = transcript
  // }, [transcript])

  const recorderProps = useRecorder({
    isStopOnSilence: true,
    onStart: async () => {
      console.log('start')
      // resetTranscript()
      // // @ts-ignore-next-line
      // SpeechRecognition.default.startListening({ continuous: true })
    },
    onStop: async (_event: any, chunks: BlobPart[]) => {
      // console.log({ transcript: transcriptRef.current })
      // return createMessageProps.createMessage({
      //   // @ts-ignore-next-line
      //   content: transcriptRef.current,
      // })

      // @ts-ignore-next-line
      const blob = new Blob(chunks, { type: chunks[0].type })
      const audioContent = await blobToData(blob)

      return createMessageProps.createMessage({
        // @ts-ignore-next-line
        audioContent,
      })
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
    createMessageProps,
    messageAudioProps,
  })

  return (
    <AudioThreadContext.Provider
      value={{
        ...audioThreadContext,
        status,
        recorderProps,
        messageAudioProps,
      }}
    >
      <Flex
        direction="column"
        flexGrow="1"
        p="9"
      >
        {children}
      </Flex>
    </AudioThreadContext.Provider>
  )
}
