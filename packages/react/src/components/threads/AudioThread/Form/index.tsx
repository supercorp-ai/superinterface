import { SpeakerModerateIcon } from '@radix-ui/react-icons'
import {
  Flex,
} from '@radix-ui/themes'
import { BarsVisualizer } from '@/components/threads/AudioThread/BarsVisualizer'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { ActionButton } from './ActionButton'

export const Form = () => {
  const audioThreadContext = useAudioThreadContext()

  return (
    <Flex
      direction="column"
      align="center"
    >
      <Flex
        pb="3"
        align="center"
      >
        <Flex
          ml="-5"
          mr="2"
          align="center"
        >
          <SpeakerModerateIcon
            style={{
              color: `var(--${audioThreadContext.status === 'recording' ? 'mint' : 'gray'}-12)`,
            }}
          />
        </Flex>

        <Flex
          px="2"
          py="1"
          style= {{
            backgroundColor: `var(--${audioThreadContext.status === 'recording' ? 'mint' : 'gray'}-4)`,
            borderRadius: 'var(--radius-6)',
          }}
        >
          <BarsVisualizer
            visualizationAnalyser={audioThreadContext.recorderProps.visualizationAnalyser}
            color={audioThreadContext.status === 'recording' ? 'mint' : 'gray'}
            height="20px"
            barWidth="12px"
          />
        </Flex>
      </Flex>

      <ActionButton />
    </Flex>
  )
}
