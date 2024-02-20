import { forwardRef } from 'react'
import {
  Flex,
  Container,
} from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

export const ThreadMessagesGroupBase = forwardRef(function ThreadMessagesGroupBase({
  children,
}: Args, ref) {
  return (
    <Container
      // @ts-ignore-next-line
      ref={ref}
      size="2"
      grow="0"
    >
      <Flex
        shrink="0"
        gap="3"
      >
        {children}
      </Flex>
    </Container>
  )
})
