import {
  Flex,
} from '@radix-ui/themes'
import { BarsVisualizer } from '@/components/threads/AudioThread/BarsVisualizer'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { useStatus } from '@/hooks/audioThreads/useStatus'
import { MicIcon } from './MicIcon'
import { ActionButton } from './ActionButton'
import type { StyleProps } from '@/types'

export const Form = (props: StyleProps) => {
  const { status } = useStatus()
  const audioThreadContext = useAudioThreadContext()

  return (
    <Flex
      direction="column"
      align="center"
      {...props}
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
               color: status === 'recording' ? 'var(--accent-11)' : 'var(--gray-11)',
             }}
           />
         </Flex>

        <Flex
          px="2"
          py="1"
          style= {{
            backgroundColor: status === 'recording' ? 'var(--accent-4)' : 'var(--gray-4)',
            borderRadius: 'var(--radius-6)',
          }}
        >
          <BarsVisualizer
            visualizationAnalyser={audioThreadContext.audioRuntime.user.visualizationAnalyser}
            backgroundColor={status === 'recording' ? 'var(--accent-11)' : 'var(--gray-11)'}
            height="20px"
            barWidth="12px"
          />
        </Flex>
      </Flex>

      <ActionButton />
    </Flex>
  )
}
