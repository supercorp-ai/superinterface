import OpenAI from 'openai'

type Args = {
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const Title = ({
  runStep,
}: Args) => {
  if (runStep.completed_at) {
    return (
      <>
        Finished getting domains availability
      </>
    )
  } else if (runStep.cancelled_at) {
    return (
      <>
        Cancelled getting domains availability
      </>
    )
  } else {
    return (
      <>
        Getting domains availability
      </>
    )
  }
}
