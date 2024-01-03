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
        Finished getting domains scores
      </>
    )
  } else if (runStep.cancelled_at) {
    return (
      <>
        Cancelled getting domains scores
      </>
    )
  } else {
    return (
      <>
        Getting domains scores
      </>
    )
  }
}
