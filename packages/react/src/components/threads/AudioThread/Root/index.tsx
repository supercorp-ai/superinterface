'use client'

// import 'regenerator-runtime/runtime'
import { Flex } from '@radix-ui/themes'
import _ from 'lodash'
import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { usePermission } from '@/hooks/misc/usePermission'
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
  const createMessageProps = useCreateMessage()

  const recorderProps = useRecorder({
    isStopOnSilence: true,
    onStart: async () => {
    },
    onStop: async (_event: any, chunks: BlobPart[]) => {
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
