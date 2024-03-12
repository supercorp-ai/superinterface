import _ from 'lodash'
import {
  Flex,
  Grid,
} from '@radix-ui/themes'
import { useState, useEffect, useCallback } from 'react'
import { cluster } from 'radash'

const barCount = 4

export const BarsVisualizer = ({
  visualizationAnalyser,
  color,
  height,
  barWidth,
}: {
  visualizationAnalyser: AnalyserNode | null
  color: string
  height: string
  barWidth: string
}) => {
  const [emptyVisualizer] = useState(() => new AudioContext().createAnalyser())
  const [barHeights, setBarHeights] = useState<number[]>([])

  const draw = useCallback(({ visualizationAnalyser }: { visualizationAnalyser: AnalyserNode }) => {
    const frequencyData = new Uint8Array(visualizationAnalyser.frequencyBinCount / 15)
    visualizationAnalyser.getByteFrequencyData(frequencyData)

    // @ts-ignore-next-line
    const clusteredFrequencyData = cluster(frequencyData, frequencyData.length / barCount)

    setBarHeights(
      clusteredFrequencyData.map((frequencyDataCluster) => (
         _.mean(frequencyDataCluster) / 255 * 100
      ))
    )

    requestAnimationFrame(() => draw({ visualizationAnalyser }))
  }, [])

  useEffect(() => {
    draw({ visualizationAnalyser: visualizationAnalyser || emptyVisualizer })
  }, [draw, visualizationAnalyser, emptyVisualizer])

  return (
    <Grid
      columns={`${barCount}`}
      gap="1"
      width="auto"
      style={{
        // TODO not sure why we need this
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      }}
    >
      {barHeights.map((barHeight, index) => (
        <Flex
          key={index}
          direction="column"
          align="center"
          justify="center"
          height={height}
        >
          <Flex
            minHeight="50%"
            maxHeight="100%"
            height={`${barHeight + 20}%`}
            width={barWidth}
            style={{
              backgroundColor: `var(--${color}-11)`,
              borderRadius: 'var(--radius-6)',
            }}
          />
        </Flex>
      ))}
    </Grid>
  )
}
            // className={`${audioThreadContext.status === 'recording' ? 'bg-mint-12' : 'bg-gray-11'} rounded-6 transition duration-300`}
