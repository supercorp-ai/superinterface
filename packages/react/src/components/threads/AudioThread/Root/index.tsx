'use client'

import { Flex } from '@radix-ui/themes'
import _ from 'lodash'
import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'
import type { StyleProps, PlayArgs } from '@/types'
import { useTtsAudioRuntime } from '@/hooks/ttsAudioRuntimes/useTtsAudioRuntime'

export type Args = {
  children: React.ReactNode
  play?: (args: PlayArgs) => void
} & StyleProps

const Content = ({
  children,
  className,
  style,
  play,
}: Args) => {
  const { ttsAudioRuntime } = useTtsAudioRuntime({
    play,
  })

  return (
    <AudioThreadContext.Provider
      value={{
        audioRuntime: ttsAudioRuntime,
      }}
    >
      <Flex
        direction="column"
        flexGrow="1"
        p="9"
        className={className}
        style={style}
      >
        {children}
      </Flex>
    </AudioThreadContext.Provider>
  )
}

export const Root = ({
  children,
  ...rest
}: Args) => (
  <ToastsProvider>
    <Content {...rest}>
      {children}
    </Content>
  </ToastsProvider>
)
