import type OpenAI from 'openai'
import { validate } from 'uuid'
import { enqueueJson } from '@superinterface/react/utils'
import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deltaContent = ({ data }: { data: any }) => {
  return (
    data.delta.content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((content: any) => {
        if (content.type === 'text') {
          return content.text.value
        }

        return ''
      })
      .join('\n\n')
  )
}

export const streamOutput = async ({
  toolCall,
  run,
  messageResponse,
  onThreadMessageCompleted = () => {},
  onThreadRunStepCompleted = () => {},
  controller,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall
  run: OpenAI.Beta.Threads.Runs.Run
  controller: ReadableStreamDefaultController
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageResponse: ReadableStream<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onThreadMessageCompleted?: ({ message }: { message: any }) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onThreadRunStepCompleted?: ({ runStep }: { runStep: any }) => void
}) => {
  // TODO figure out how to stream non-prisma runs
  if (!validate(run.id)) {
    return
  }

  // TODO: get real run step id somehow
  const latestRunStep = await prisma.runStep.findFirst({
    where: {
      runId: run.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const index =
    run.required_action?.submit_tool_outputs.tool_calls.findIndex(
      (tc) => tc.id === toolCall.id,
    ) ?? 0

  // @ts-expect-error unclear type
  for await (const value of messageResponse) {
    const data = JSON.parse(Buffer.from(value).toString('utf-8'))

    if (data.event === 'thread.message.delta') {
      enqueueJson({
        controller,
        value: {
          event: 'thread.run.step.delta',
          data: {
            object: 'thread.run.step.delta',
            run_id: run.id,
            // TODO: proper id
            id: latestRunStep?.id ?? '1',
            delta: {
              step_details: {
                type: 'tool_calls',
                tool_calls: [
                  {
                    id: toolCall.id,
                    type: 'function',
                    index,
                    function: {
                      output: deltaContent({ data: data.data }),
                    },
                  },
                ],
              },
            },
          },
        },
      })
    }

    if (data.event === 'thread.message.completed') {
      onThreadMessageCompleted({
        message: data.data,
      })
    }

    if (data.event === 'thread.run.step.completed') {
      onThreadRunStepCompleted({
        runStep: data.data,
      })
    }
  }
}
