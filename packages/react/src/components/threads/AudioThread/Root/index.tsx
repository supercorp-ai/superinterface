'use client'

import { Flex } from '@radix-ui/themes'
import _ from 'lodash'
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

  const recorderProps = useRecorder({
    isStopOnSilence: false,
    onStop: async (_event: any, chunks: BlobPart[]) => {
      // @ts-ignore-next-line
      const blob = new Blob(chunks, { type: chunks[0].type })
      const audioContent = await blobToData(blob)

      return createThreadMessageProps.createThreadMessage({
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
      >
        {children}
      </Flex>
    </AudioThreadContext.Provider>
  )
}
