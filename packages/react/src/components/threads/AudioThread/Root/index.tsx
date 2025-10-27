'use client'

import { Flex } from '@radix-ui/themes'
import _ from 'lodash'
import { AudioThreadContext } from '@/contexts/threads/AudioThreadContext'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { ToastsProvider } from '@/components/toasts/ToastsProvider'
import type {
  StyleProps,
  AudioRuntime,
  MessageAudioOverrides,
  DefaultAudioSegment,
  PlayArgs,
} from '@/types'
import { TtsAudioRuntimeProvider } from '@/components/audioRuntimes/TtsAudioRuntimeProvider'

export type Args<TSegment = DefaultAudioSegment> = {
  children: React.ReactNode
  play?: (args: PlayArgs<TSegment>) => Promise<void> | void
  playSegments?: MessageAudioOverrides<TSegment>['playSegments']
  getSegments?: MessageAudioOverrides<TSegment>['getSegments']
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

const AudioRuntimeProvider = <TSegment,>({
  children,
  onEnd,
  play,
  playSegments,
  getSegments,
}: {
  children: React.ReactNode
  onEnd?: () => void
  play?: (args: PlayArgs<TSegment>) => Promise<void> | void
  playSegments?: MessageAudioOverrides<TSegment>['playSegments']
  getSegments?: MessageAudioOverrides<TSegment>['getSegments']
}) => {
  const audioThreadContext = useAudioThreadContext()

  if (audioThreadContext.audioRuntime) {
    return children
  }

  return (
    <TtsAudioRuntimeProvider<TSegment>
      onEnd={onEnd}
      play={play}
      playSegments={playSegments}
      getSegments={getSegments}
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

export const Root = <TSegment = DefaultAudioSegment,>({
  children,
  play,
  playSegments,
  getSegments,
  onEnd,
  className,
  style,
  ...rest
}: Args<TSegment>) => {
  return (
    <Provider {...rest}>
      <AudioRuntimeProvider
        onEnd={onEnd}
        play={play}
        playSegments={playSegments}
        getSegments={getSegments}
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
