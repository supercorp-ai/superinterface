import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Button,
} from '@radix-ui/themes'
import {
  Spinner,
} from '@/components/spinners/Spinner'
import { useMessageFormContext } from '@/hooks/messages/useMessageFormContext'

export const Submit = () => {
  const { isDisabled, isLoading } = useMessageFormContext()

  return (
    <Button
      type="submit"
      radius="large"
      disabled={isDisabled}
    >
      {isLoading ? <Spinner /> : <ArrowUpIcon />}
    </Button>
  )
}
