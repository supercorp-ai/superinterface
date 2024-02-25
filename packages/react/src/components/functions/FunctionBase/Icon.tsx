import OpenAI from 'openai'
import {
  CircleIcon,
  CircleBackslashIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons'

type Args = {
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const Icon = ({
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
