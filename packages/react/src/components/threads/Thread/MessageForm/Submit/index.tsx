'use client'

import {
  ArrowUpIcon,
  StopIcon,
} from '@radix-ui/react-icons'
import {
  IconButton,
} from '@radix-ui/themes'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'

export const Submit = () => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { isDisabled, isLoading } = useMessageFormContext()

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
      disabled={isDisabled}
    >
      <ArrowUpIcon />
    </IconButton>
  )
}
