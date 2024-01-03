import { forwardRef } from 'react'
import {
  Flex,
  Button,
  PopoverTrigger
} from '@radix-ui/themes'

type Args = {
  children: React.ReactNode
}

export const ToolCallBase = forwardRef(function ToolCallBase({
  children,
}: Args, ref) {
  return (
    <Flex
      py="1"
      ml="-2"
    >
      <PopoverTrigger>
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
      </PopoverTrigger>
    </Flex>
  )
})
