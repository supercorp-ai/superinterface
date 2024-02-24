import { SpeakerModerateIcon } from '@radix-ui/react-icons'
import {
  Flex,
} from '@radix-ui/themes'
import { Visualizer } from './Visualizer'
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
            className={`${audioThreadContext.status === 'recording' ? 'text-mint-12' : 'text-gray-11'}`}
          />
        </Flex>

        <Flex
          className={`${audioThreadContext.status === 'recording' ? 'bg-mint-4' : 'bg-gray-4'} rounded-6`}
          px="2"
          py="1"
        >
          <Visualizer />
        </Flex>
      </Flex>

      <ActionButton />
    </Flex>
  )
}
