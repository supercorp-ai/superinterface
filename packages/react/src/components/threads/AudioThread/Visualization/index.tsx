import _ from 'lodash'
import { Flex } from '@radix-ui/themes'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'

export const Visualization = () => {
  const audioThreadContext = useAudioThreadContext()

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      mb="3"
      grow="1"
    >
      <Flex
        align="center"
        justify="center"
        style={{
          backgroundColor: `var(--${audioThreadContext.status === 'playing' ? 'mint' : 'gray'}-4)`,
          height: '200px',
          width: '200px',
          borderRadius: '9999px',
        }}
      >
      </Flex>
    </Flex>
  )
}
        // className={`transition duration-300 ${audioThreadContext.status === 'playing' ? 'bg-mint-4' : 'bg-gray-4'}`}
// import { Visualizer } from '@/components/audio/Visualizer'
//         <Visualizer
//           visualizationAnalyser={visualizationAnalyser}
//           bgColorClassName={audioThreadContext.status === 'playing' ? 'bg-mint-12' : 'bg-gray-11'}
//         />
