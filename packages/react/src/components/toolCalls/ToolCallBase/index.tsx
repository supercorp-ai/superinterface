import { forwardRef } from 'react'
import {
  Flex,
  Button,
} from '@radix-ui/themes'

export const ToolCallBase = forwardRef(function ToolCallBase({
  children,
}: {
  children: React.ReactNode
}, ref: React.Ref<HTMLDivElement>) {
  return (
    <Flex
      ref={ref}
      py="1"
      ml="-2"
    >
      <Button
        size="1"
        color="gold"
        variant="outline"
        style={{
          boxShadow: 'none',
        }}
      >
        {children}
      </Button>
    </Flex>
  )
})
