import { forwardRef } from 'react'
import {
  Flex,
  Container,
} from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

export const MessageGroupBase = forwardRef(function MessageGroupBase({
  children,
}: Args, ref) {
  return (
    <Container
      // @ts-ignore-next-line
      ref={ref}
      size="2"
      flexGrow="0"
    >
      <Flex
        flexShrink="0"
        gap="3"
      >
        {children}
      </Flex>
    </Container>
  )
})
