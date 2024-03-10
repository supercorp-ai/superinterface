'use client'
import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Button,
  Spinner,
} from '@radix-ui/themes'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'

export const Submit = () => {
  const { isDisabled, isLoading } = useMessageFormContext()

  return (
    <Button
      type="submit"
      radius="large"
      disabled={isDisabled || isLoading}
    >
      <Spinner loading={isLoading}>
        <ArrowUpIcon />
      </Spinner>
    </Button>
  )
}
