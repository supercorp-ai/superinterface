import {
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import {
  Button,
} from '@radix-ui/themes'
import {
  Spinner,
} from '@/components/spinners/Spinner'

type Args = {
  isLoading: boolean
  isDisabled: boolean
}

export const Submit = ({
  isLoading,
  isDisabled
}: Args) => (
  <Button
    type="submit"
    radius="large"
    disabled={isDisabled}
  >
    {isLoading ? <Spinner /> : <ArrowUpIcon />}
  </Button>
)
