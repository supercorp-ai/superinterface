import type OpenAI from 'openai'

export const runFailedLogMessage = ({
  run,
}: {
  run: OpenAI.Beta.Threads.Runs.Run
}) => {
  const errorMessage = run.last_error?.message ?? 'Unknown error'
  const errorCode = run.last_error?.code
    ? ` (code: ${run.last_error.code})`
    : ''
  const runId = run.id ? ` [run: ${run.id}]` : ''

  return `Thread Run failed: ${errorMessage}${errorCode}${runId}`
}
