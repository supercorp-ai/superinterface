import { QueryClient } from '@tanstack/react-query'
import _ from 'lodash'
import { omit } from 'radash'
import OpenAI from 'openai'
import { SerializedMessage, SerializedRunStep, ThreadRunStepDeltaEvent, MessagesQueryKey } from '@/types'

const updatedToolCall = ({
  toolCall,
  delta,
}: {
  toolCall: OpenAI.Beta.Threads.Runs.ToolCall
  delta: OpenAI.Beta.Threads.Runs.ToolCallDelta
}) => {
  if (!toolCall) {
    return omit(delta, ['index'])
  }

  if (delta.type === 'function' && delta.function && toolCall.type === 'function' && toolCall.function) {
    const result = _.cloneDeep(toolCall)

    for (const [key, value] of Object.entries(delta.function)) {
      // @ts-ignore-next-line
      result.function[key] = `${result.function[key] ?? ''}${value}`
    }

    return result
  }

  return toolCall
}

const updatedRunStep = ({
  runStep,
  value,
}: {
  runStep: SerializedRunStep
  value: ThreadRunStepDeltaEvent
}) => {
  if (!runStep?.step_details?.tool_calls) return runStep

  if (value.data.delta?.step_details?.type === 'tool_calls') {
    if (!value.data.delta.step_details.tool_calls) return runStep

    const newToolCalls = _.cloneDeep(runStep.step_details.tool_calls)

    value.data.delta.step_details.tool_calls.forEach((delta: OpenAI.Beta.Threads.Runs.ToolCallDelta) => (
      newToolCalls[delta.index] = updatedToolCall({
        toolCall: newToolCalls[delta.index],
        delta,
      })
    ))

    return {
      ...runStep,
      step_details: {
        ...runStep.step_details,
        ...value.data.delta.step_details,
        tool_calls: newToolCalls,
      },
    }
  } else {
    return runStep
  }
}


export const threadRunStepDelta = ({
  value,
  queryClient,
  messagesQueryKey,
}: {
  value: ThreadRunStepDeltaEvent
  messagesQueryKey: MessagesQueryKey
  queryClient: QueryClient
}) => (
  queryClient.setQueryData(
    messagesQueryKey,
    (prevData: any) => {
      if (!prevData) return prevData

      const [latestPage, ...pagesRest] = prevData.pages

      return {
        ...prevData,
        pages: [
          {
            ...latestPage,
            data: latestPage.data.map((m: SerializedMessage) => {
              if (m.run_id === value.data.run_id) {
                return {
                  ...m,
                  runSteps: m.runSteps.map((rs: SerializedRunStep) => {
                    if (rs.id === value.data.id) {
                      return updatedRunStep({ runStep: rs, value })
                    }

                    return rs
                  }),
                }
              }

              return m
            }),
          },
          ...pagesRest,
        ],
      }
    }
  )
)
