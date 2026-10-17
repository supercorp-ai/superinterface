import { redis } from '@/lib/redis'

const CLIENT_TOOL_OUTPUT_TTL_SECONDS = 60 * 60 * 24 * 7

const TASK_CLIENT_TOOL_OUTPUT = 'Client tools cannot be used during tasks'

// `data.required_action` is only read once the event is known to be a
// requires-action event, which always carries it.
type TaskStreamEvent = {
  event: string
  data: {
    required_action: {
      type: string
      submit_client_tool_outputs: {
        tool_calls: { id: string }[]
      }
    }
  }
}

// Nobody can answer client tool calls during a task, so their outputs are
// answered right away instead of waiting for a client that never comes.
export const rejectClientToolCalls = async ({
  event,
}: {
  event: TaskStreamEvent
}) => {
  const requiresClientToolOutputs =
    event.event === 'thread.run.requires_action' &&
    event.data.required_action.type === 'submit_client_tool_outputs'

  if (!requiresClientToolOutputs) return

  await Promise.all(
    event.data.required_action.submit_client_tool_outputs.tool_calls.map(
      (toolCall) =>
        redis.set(
          `submit-client-tool-outputs:output:${toolCall.id}`,
          TASK_CLIENT_TOOL_OUTPUT,
          { ex: CLIENT_TOOL_OUTPUT_TTL_SECONDS },
        ),
    ),
  )
}
