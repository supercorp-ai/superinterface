import _ from 'lodash'
import { Flex } from '@radix-ui/themes'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { BarsVisualizer } from '@/components/threads/AudioThread/BarsVisualizer'

export const Visualization = () => {
  const audioThreadContext = useAudioThreadContext()

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
          backgroundColor: `var(--${audioThreadContext.status === 'playing' ? 'mint' : 'gray'}-4)`,
          borderRadius: '9999px',
        }}
      >
        <BarsVisualizer
          visualizationAnalyser={audioThreadContext.messageAudioProps.visualizationAnalyser}
          color={audioThreadContext.status === 'playing' ? 'mint' : 'gray'}
          height="40px"
          barWidth="24px"
        />
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
