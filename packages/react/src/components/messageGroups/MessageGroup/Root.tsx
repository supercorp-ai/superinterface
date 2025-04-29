import { forwardRef } from 'react'
import {
  Flex,
  Container,
} from '@radix-ui/themes'
import type { StyleProps } from '@/types'

type Args = {
  children: React.ReactNode
} & StyleProps

export const Root = forwardRef(function Root({
  children,
  style,
  className,
}: Args, ref: React.Ref<HTMLDivElement>) {
  return (
    <Container
      ref={ref}
      size="2"
      flexGrow="0"
      className={className}
      style={style}
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
