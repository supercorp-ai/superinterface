import type OpenAI from 'openai'
import type { CancelInFlightRunArgs } from './cancelInFlightRun'

type Run = OpenAI.Beta.Threads.Runs.Run

type RunProgress = Pick<CancelInFlightRunArgs, 'inProgressRun' | 'hasCompleted'>

const IN_PROGRESS_EVENT = 'thread.run.in_progress'
const COMPLETED_EVENT = 'thread.run.completed'
const TRACKED_EVENTS = [IN_PROGRESS_EVENT, COMPLETED_EVENT]

// Records the latest run a message stream reported as in progress and as
// completed.
export const runProgressTracker = () => {
  const latestRuns = new Map<string, Run>()

  const track = ({ event, data }: { event: string; data: Run }) => {
    if (TRACKED_EVENTS.includes(event)) latestRuns.set(event, data)
  }

  const progress = (): RunProgress => {
    const inProgressRun = latestRuns.get(IN_PROGRESS_EVENT)

    return {
      inProgressRun: inProgressRun
        ? { id: inProgressRun.id, thread_id: inProgressRun.thread_id }
        : null,
      hasCompleted: Boolean(latestRuns.get(COMPLETED_EVENT)),
    }
  }

  return { track, progress }
}
