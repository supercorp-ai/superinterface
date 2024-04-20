import {
  Flex,
} from '@radix-ui/themes'
import { BarsVisualizer } from '@/components/threads/AudioThread/BarsVisualizer'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { MicIcon } from './MicIcon'
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
           ml="-22.5px"
           mr="2"
           align="center"
         >
           <MicIcon
             style={{
               color: audioThreadContext.status === 'recording' ? 'var(--accent-11)' : 'var(--gray-11)',
             }}
           />
         </Flex>

        <Flex
          px="2"
          py="1"
          style= {{
            backgroundColor: audioThreadContext.status === 'recording' ? 'var(--accent-4)' : 'var(--gray-4)',
            borderRadius: 'var(--radius-6)',
          }}
        >
          <BarsVisualizer
            visualizationAnalyser={audioThreadContext.recorderProps.visualizationAnalyser}
            backgroundColor={audioThreadContext.status === 'recording' ? 'var(--accent-11)' : 'var(--gray-11)'}
            height="20px"
            barWidth="12px"
          />
        </Flex>
      </Flex>

      <ActionButton />
    </Flex>
  )
}
