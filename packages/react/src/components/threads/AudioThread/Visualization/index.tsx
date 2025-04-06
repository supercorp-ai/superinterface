import { useState, useCallback, useEffect, useContext, createContext } from 'react'
import _ from 'lodash'
import { Flex } from '@radix-ui/themes'
import { AssistantAvatar } from '@/components/messageGroups/MessageGroupBase/AssistantAvatar'
import { Name } from '@/components/messageGroups/MessageGroupBase/Name'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { BarsVisualizer as AudioThreadBarsVisualizer } from '@/components/threads/AudioThread/BarsVisualizer'
import { useStatus } from '@/hooks/audioThreads/useStatus'
import type { StyleProps } from '@/types'

const AudioThreadVisualizationContext = createContext<{
  scale: number
}>({
  scale: 0,
})

const Provider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const audioThreadContext = useAudioThreadContext()
  const [scale, setScale] = useState(0)

  const draw = useCallback(({ visualizationAnalyser }: { visualizationAnalyser: AnalyserNode | null }) => {
    if (!visualizationAnalyser) {
      setScale(1)
      return
    }

    const frequencyData = new Uint8Array(visualizationAnalyser.frequencyBinCount / 15)
    visualizationAnalyser.getByteFrequencyData(frequencyData)

    setScale(1 + _.mean(frequencyData) / 255 / 10)

    requestAnimationFrame(() => draw({ visualizationAnalyser }))
  }, [])

  useEffect(() => {
    draw({ visualizationAnalyser: audioThreadContext.audioRuntime!.user.visualizationAnalyser })
  }, [draw, audioThreadContext])

  return (
    <AudioThreadVisualizationContext.Provider value={{ scale }}>
      {children}
    </AudioThreadVisualizationContext.Provider>
  )
}

const Root = ({
  children,
  ...rest
}: {
  children: React.ReactNode
}) => (
  <Provider>
    <Flex
      direction="column"
      align="center"
      justify="center"
      mb="3"
      flexGrow="1"
      {...rest}
    >
      {children}
    </Flex>
  </Provider>
)

const BarsVisualizer = ({
  height = '40px',
  barWidth = '24px',
  ...rest
}: StyleProps & {
  height?: string
  barWidth?: string
}) => {
  const { status } = useStatus()
  const audioThreadContext = useAudioThreadContext()

  return (
    <AudioThreadBarsVisualizer
      visualizationAnalyser={audioThreadContext.audioRuntime!.assistant.visualizationAnalyser}
      backgroundColor={status === 'playing' ? 'var(--accent-11)' : 'var(--gray-11)'}
      height={height}
      barWidth={barWidth}
      {...rest}
    />
  )
}

const AssistantVisualizationRoot = ({
  children,
  height = '200px',
  width = '200px',
  ...rest
}: StyleProps & {
  children: React.ReactNode
  height?: string
  width?: string
}) => {
  const { status } = useStatus()
  const { scale } = useContext(AudioThreadVisualizationContext)

  return (
    <Flex
      align="center"
      justify="center"
      height={height}
      width={width}
      style={{
        backgroundColor: status === 'playing' ? 'var(--accent-4)' : 'var(--gray-4)',
        borderRadius: '9999px',
        scale,
        ...rest.style ?? {},
      }}
      {...rest}
    >
      {children}
    </Flex>
  )
}

const AssistantVisualization = (props: StyleProps & {
  height?: string
  width?: string
}) => (
  <AssistantVisualizationRoot
    {...props}
  >
    <BarsVisualizer />
  </AssistantVisualizationRoot>
)

AssistantVisualization.Root = AssistantVisualizationRoot
AssistantVisualization.BarsVisualizer = BarsVisualizer

const AssistantInfo = (props: StyleProps) => {
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <Flex
      ml="-22.5px"
      gap="3"
      pt="5"
      {...props}
    >
      <AssistantAvatar />
      <Name>
        {assistantNameContext}
      </Name>
    </Flex>
  )
}

export const Visualization = (props: StyleProps) => (
  <Root {...props}>
    <AssistantVisualization />
    <AssistantInfo />
  </Root>
)

Visualization.Root = Root
Visualization.Provider = Provider
Visualization.AssistantVisualization = AssistantVisualization
Visualization.AssistantInfo = AssistantInfo
