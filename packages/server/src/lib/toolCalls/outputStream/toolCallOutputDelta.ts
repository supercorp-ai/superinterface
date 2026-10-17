// Where in the parent run a tool call's streamed output belongs.
export type ToolCallOutputTarget = {
  runId: string
  runStepId: string
  toolCallId: string
  index: number
}

// A run step delta that appends output to the tool call.
export const toolCallOutputDelta = ({
  target: { runId, runStepId, toolCallId, index },
  output,
}: {
  target: ToolCallOutputTarget
  output: string
}) => ({
  event: 'thread.run.step.delta',
  data: {
    object: 'thread.run.step.delta',
    run_id: runId,
    id: runStepId,
    delta: {
      step_details: {
        type: 'tool_calls',
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            index,
            function: {
              output,
            },
          },
        ],
      },
    },
  },
})
