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

const Root = ({
  children,
}: {
  children: React.ReactNode
}) => (
  <Flex
    flexShrink="0"
    align="end"
  >
    {children}
  </Flex>
)

const Button = () => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { isDisabled, isLoading, isFileLoading } = useMessageFormContext()

  if (isLoading) {
    return (
      <IconButton
        type="button"
        onClick={() => superinterfaceContext.createMessageAbortControllerRef.current?.abort()}
      >
        <StopIcon />
      </IconButton>
    )
  }

  return (
    <IconButton
      type="submit"
      disabled={isDisabled || isFileLoading}
    >
      <ArrowUpIcon />
    </IconButton>
  )
}

export const Submit = () => (
  <Root>
    <Button />
  </Root>
)

Submit.Root = Root
Submit.Button = Button
