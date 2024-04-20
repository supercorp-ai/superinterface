import { useContext } from 'react'
import _ from 'lodash'
import { Flex } from '@radix-ui/themes'
import { AssistantAvatar } from '@/components/messageGroups/MessageGroupBase/AssistantAvatar'
import { Name } from '@/components/messageGroups/MessageGroupBase/Name'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { BarsVisualizer } from '@/components/threads/AudioThread/BarsVisualizer'

export const Visualization = () => {
  const audioThreadContext = useAudioThreadContext()
  const assistantNameContext = useContext(AssistantNameContext)

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      mb="3"
      flexGrow="1"
    >
      <Flex
        align="center"
        justify="center"
        height="200px"
        width="200px"
        style={{
          backgroundColor: audioThreadContext.status === 'playing' ? 'var(--accent-4)' : 'var(--gray-4)',
          borderRadius: '9999px',
        }}
      >
        <BarsVisualizer
          visualizationAnalyser={audioThreadContext.messageAudioProps.visualizationAnalyser}
          backgroundColor={audioThreadContext.status === 'playing' ? 'var(--accent-11)' : 'var(--gray-11)'}
          height="40px"
          barWidth="24px"
        />
      </Flex>

      <Flex
        ml="-22.5px"
        gap="3"
        pt="5"
      >
        <AssistantAvatar />
        <Name>
          {assistantNameContext}
        </Name>
      </Flex>
    </Flex>
  )
}
