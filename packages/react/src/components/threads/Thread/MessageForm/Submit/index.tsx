'use client'

import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  IconButton,
  Spinner,
} from '@radix-ui/themes'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'

export const Submit = () => {
  const { isDisabled, isLoading } = useMessageFormContext()

  return (
    <IconButton
      type="submit"
      disabled={isDisabled || isLoading}
    >
      <Spinner loading={isLoading}>
        <ArrowUpIcon />
      </Spinner>
    </IconButton>
  )
}
