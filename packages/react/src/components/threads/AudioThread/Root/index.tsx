'use client'

import { Flex } from '@radix-ui/themes'
import _ from 'lodash'
import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'
import type { StyleProps, AudioRuntime, PlayArgs } from '@/types'
import { TtsAudioRuntimeProvider } from '@/components/audioRuntimes/TtsAudioRuntimeProvider'

export type Args = {
  children: React.ReactNode
  play?: (args: PlayArgs) => Promise<void> | void
  onEnd?: () => void
  audioRuntime?: AudioRuntime
} & StyleProps

const Content = ({ children, className, style }: Args) => (
  <Flex
    direction="column"
    flexGrow="1"
    p="9"
    className={className}
    style={style}
  >
    {children}
  </Flex>
)

const AudioRuntimeProvider = ({
  children,
  onEnd,
  play,
}: {
  children: React.ReactNode
  onEnd?: () => void
  play?: (args: PlayArgs) => Promise<void> | void
}) => {
  const audioThreadContext = useAudioThreadContext()

  if (audioThreadContext.audioRuntime) {
    return children
  }

  return (
    <TtsAudioRuntimeProvider
      onEnd={onEnd}
      play={play}
    >
      {children}
    </TtsAudioRuntimeProvider>
  )
}

const Provider = ({ children, ...rest }: { children: React.ReactNode }) => {
  const audioThreadContext = useAudioThreadContext()

  return (
    <AudioThreadContext.Provider
      value={{
        ...audioThreadContext,
        ...rest,
      }}
    >
      {children}
    </AudioThreadContext.Provider>
  )
}

export const Root = ({
  children,
  play,
  onEnd,
  className,
  style,
  ...rest
}: Args) => {
  return (
    <Provider {...rest}>
      <AudioRuntimeProvider
        onEnd={onEnd}
        play={play}
      >
        <ToastsProvider>
          <Content
            className={className}
            style={style}
          >
            {children}
          </Content>
        </ToastsProvider>
      </AudioRuntimeProvider>
    </Provider>
  )
}
