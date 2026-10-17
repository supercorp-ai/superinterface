import OpenAI from 'openai'
import { parseTaskToolArgsJson } from './parseTaskToolArgsJson'
import { getScheduleArg } from './getScheduleArg'
import { checkScheduleArg } from './checkScheduleArg'
import type { TaskToolArgsCheck } from './TaskToolArgsCheck'

// Parses task tool arguments and checks the schedule when one is given.
export const checkTaskToolArgs = ({
  toolCall,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
}): TaskToolArgsCheck<unknown> => {
  const parsed = parseTaskToolArgsJson({ toolCall })
  if (!parsed.ok) return parsed

  const scheduleArg = getScheduleArg({ args: parsed.value })
  if (scheduleArg === undefined) return parsed

  const scheduleCheck = checkScheduleArg({ scheduleArg })
  if (!scheduleCheck.ok) return scheduleCheck

  return parsed
}
