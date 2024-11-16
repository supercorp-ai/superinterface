'use client'

import {
  ArrowUpIcon,
  StopIcon,
} from '@radix-ui/react-icons'
import {
  IconButton,
  Flex,
} from '@radix-ui/themes'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import type { StyleProps } from '@/types'

const Root = ({
  children,
  style,
  className,
}: {
  children: React.ReactNode
} & StyleProps) => (
  <Flex
    flexShrink="0"
    align="end"
    style={style}
    className={className}
  >
    {children}
  </Flex>
)

const Button = (props: StyleProps) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { isDisabled, isLoading, isFileLoading } = useMessageFormContext()

  if (isLoading) {
    return (
      <IconButton
        type="button"
        onClick={() => superinterfaceContext.createMessageAbortControllerRef.current?.abort()}
        {...props}
      >
        <StopIcon />
      </IconButton>
    )
  }

  return (
    <IconButton
      type="submit"
      disabled={isDisabled || isFileLoading}
      {...props}
    >
      <ArrowUpIcon />
    </IconButton>
  )
}

export const Submit = (props: StyleProps) => (
  <Root {...props}>
    <Button />
  </Root>
)

Submit.Root = Root
Submit.Button = Button
