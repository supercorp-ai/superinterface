import { useState } from 'react'
import {
  Flex,
  Text,
} from '@radix-ui/themes'
import { useInterval } from 'react-use'

export const StatusMessages = ({
  texts,
}: {
  texts: string[]
}) => {
  const [currentText, setCurrentText] = useState(texts[0])

  useInterval(() => {
    setCurrentText((prev) => {
      const currentIndex = texts.indexOf(prev)
      const nextIndex = currentIndex + 1

      return texts[nextIndex] || texts[0]
    })
  }, 3000)

  return (
    <Flex
      justify="center"
      pb="5"
    >
      <Text
        size="2"
        weight="regular"
        color="gray"
      >
        {currentText}
      </Text>
    </Flex>
  )
}
