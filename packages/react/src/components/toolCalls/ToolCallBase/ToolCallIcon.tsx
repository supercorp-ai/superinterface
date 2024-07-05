import {
  CircleIcon,
  CircleBackslashIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons'
import type { SerializedRunStep } from '@/types'

type Args = {
  runStep: SerializedRunStep
}

export const ToolCallIcon = ({
  runStep,
}: Args) => {
  if (runStep.completed_at) {
    return (
      <CheckCircledIcon />
    )
  } else if (runStep.cancelled_at || runStep.failed_at || runStep.status === 'expired') {
    return (
      <CircleBackslashIcon />
    )
  } else {
    return (
      <CircleIcon />
    )
  }
}
