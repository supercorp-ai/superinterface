import _ from 'lodash'
import {
  useQueryClient,
} from '@tanstack/react-query'
import { optimisticId } from '@/lib/optimistic/optimisticId'
import { Run, RunStep, Message } from '@/types'
// import { JSONParser } from '@streamparser/json'
import { JSONParser } from '@streamparser/json-whatwg'
import { replace, omit, mapEntries, fork, last } from 'radash'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

type VariablesArgs = {
  content: string
  [key: string]: any
}

const extendMessage = ({
  message,
  messages,
}: {
  message: Message
  messages: Message[]
}) => {
  const prevRunMessages = messages.filter((m: Message) => (
    m.run_id === message.run_id
  ))

  const prevOptimitisticRunMessages = prevRunMessages.filter((m: Message) => (
    isOptimistic({ id: m.id })
  ))

  const runSteps = last(prevOptimitisticRunMessages)?.runSteps ?? last(prevRunMessages)?.runSteps ?? []

  return {
    ...message,
    runSteps,
  }
}

const appendMessage = ({
  message,
  messages,
}: {
  message: Message
  messages: Message[]
}) => {
  const prevMessages = messages.filter((m: Message) => (
    m.run_id != message.run_id || !isOptimistic({ id: m.id })
  ))

  return [
    extendMessage({ message, messages }),
    ...prevMessages,
  ]
}

const messageCreatedData = ({
  message,
}: {
  message: any
}) => (prevData: any) => {
  if (!prevData) {
    return {
      pageParams: [],
      pages: [
        {
          data: appendMessage({ message, messages: [] }),
          hasNextPage: false,
          lastId: message.id,
        },
      ],
    }
  }

  const [latestPage, ...pagesRest] = prevData.pages

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: appendMessage({ message, messages: latestPage.data }),
      },
      ...pagesRest,
    ],
  }
}

const updatedContentPart = ({
  prevContentPart,
  delta,
}: {
  prevContentPart: any
  delta: any
}) => {
  if (!prevContentPart) {
    return omit(delta, ['index'])
  }

  return {
    ...prevContentPart,
    text: {
      ...prevContentPart.text,
      value: `${prevContentPart.text.value}${delta.text.value}`,
      annotations: [
        ...(prevContentPart.text.annotations ?? []),
        ...(delta.text.annotations ?? []),
      ]
    },
  }
}

const updatedContent = ({
  content,
  messageDelta,
}: {
  content: any
  messageDelta: any
}) => {
  const result = _.cloneDeep(content)

  messageDelta.delta.content.forEach((delta: any) => {
    result[delta.index] = updatedContentPart({
      prevContentPart: result[delta.index],
      delta,
    })
  })

  return result
}

const messageDeltaData = ({
  messageDelta,
}: {
  messageDelta: any
}) => (prevData: any) => {
  if (!prevData) {
    return {
      pageParams: [],
      pages: [
        {
          data: [],
          hasNextPage: false,
          lastId: null,
        },
      ],
    }
  }

  const [latestPage, ...pagesRest] = prevData.pages
  const [latestMessage, ...messagesRest] = latestPage.data

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: [
          {
            ...latestMessage,
            content: updatedContent({ content: latestMessage.content, messageDelta }),
          },
          ...messagesRest,
        ],
      },
      ...pagesRest,
    ],
  }
}

const messageCompletedData = ({
  message,
}: {
  message: any
}) => (prevData: any) => {
  if (!prevData) {
    return {
      pageParams: [],
      pages: [
        {
          data: [],
          hasNextPage: false,
          lastId: null,
        },
      ],
    }
  }

  const [latestPage, ...pagesRest] = prevData.pages

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: replace(latestPage.data, extendMessage({ message, messages: latestPage.data }), (m) => m.id === message.id),
      },
      ...pagesRest,
    ],
  }
}

const runCreatedData = ({
  run,
}: {
  run: Run
}) => (prevData: any) => {
  if (!prevData) return prevData

  const [latestPage, ...pagesRest] = prevData.pages

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: [
          {
            id: optimisticId(),
            assistant_id: run.assistant_id,
            content: [],
            created_at: run.created_at,
            file_ids: [],
            metadata: {},
            status: 'in_progress',
            role: 'assistant',
            runSteps: [],
            run_id: run.id,
            thread_id: run.thread_id,
          },
          ...latestPage.data,
        ]
      },
      ...pagesRest,
    ],
  }
}

const runStepCreatedData = ({
  runStep,
}: {
  runStep: RunStep
}) => (prevData: any) => {
  if (!prevData) return prevData

  const [latestPage, ...pagesRest] = prevData.pages
  const message = latestPage.data.findLast((m: Message) => m.run_id === runStep.run_id)

  if (!message) {
    return prevData
  }

  const newMessage = {
    ...message,
    runSteps: [
      runStep,
      ...message.runSteps,
    ],
  }

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: replace(latestPage.data, newMessage, (m) => m.id === newMessage.id),
      },
      ...pagesRest,
    ],
  }
}

const updatedToolCall = ({
  toolCall,
  delta,
}: {
  toolCall: any
  delta: any
}) => {
  if (!toolCall) {
    return omit(delta, ['index'])
  }

  if (delta.type !== 'function') return toolCall

  const result = _.cloneDeep(toolCall)

  for (const [key, value] of Object.entries(delta.function)) {
    result.function[key] = `${result.function[key] ?? ''}${value}`
  }

  return result
}

const updatedRunStep = ({
  runStep,
  delta,
}: {
  runStep: RunStep
  delta: any
}) => {
  if (!runStep?.step_details?.tool_calls) return runStep

  const newToolCalls = _.cloneDeep(runStep.step_details.tool_calls)

  delta.step_details.tool_calls.forEach((delta: any) => (
    newToolCalls[delta.index] = updatedToolCall({
      toolCall: newToolCalls[delta.index],
      delta,
    })
  ))

  return {
    ...runStep,
    step_details: {
      ...runStep.step_details,
      ...delta.step_details,
      tool_calls: newToolCalls,
    },
  }
}

const runStepDeltaData = ({
  runStepDelta,
}: {
  runStepDelta: any
}) => (prevData: any) => {
  if (!prevData) return prevData

  const [latestPage, ...pagesRest] = prevData.pages

  const message = latestPage.data.findLast((m: Message) => (
    m.runSteps.some((rs: RunStep) => (
      rs.id === runStepDelta.id
    ))
  ))

  if (!message) return prevData

  const runStep = message.runSteps.findLast((rs: RunStep) => (
    rs.id === runStepDelta.id
  ))

  if (!runStep) return prevData

  const newMessage = {
    ...message,
    runSteps: replace(message.runSteps, updatedRunStep({ runStep, delta: runStepDelta.delta }), (rs: RunStep) => rs.id === runStep.id),
  }

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: replace(latestPage.data, newMessage, (m: Message) => m.id === newMessage.id),
      },
      ...pagesRest,
    ],
  }
}

const runStepCompletedData = ({
  runStep,
}: {
  runStep: RunStep
}) => (prevData: any) => {
  if (!prevData) return prevData

  const [latestPage, ...pagesRest] = prevData.pages

  const message = latestPage.data.findLast((m: Message) => (
    m.runSteps.some((rs: RunStep) => (
      rs.id === runStep.id
    ))
  ))

  if (!message) return prevData

  const existingRunStep = message.runSteps.findLast((rs: RunStep) => (
    rs.id === runStep.id
  ))

  if (!existingRunStep) return prevData

  const newMessage = {
    ...message,
    runSteps: replace(message.runSteps, runStep, (rs: RunStep) => rs.id === runStep.id),
  }

  return {
    ...prevData,
    pages: [
      {
        ...latestPage,
        data: replace(latestPage.data, newMessage, (m: Message) => m.id === newMessage.id),
      },
      ...pagesRest,
    ],
  }
}

export const mutationOptions = ({
  mutationKeyBase,
  path,
  queryClient,
  threadContext,
  superinterfaceContext,
}: {
  mutationKeyBase: string[]
  path: string,
  queryClient: ReturnType<typeof useQueryClient>,
  threadContext: ReturnType<typeof useThreadContext>,
  superinterfaceContext: ReturnType<typeof useSuperinterfaceContext>,
}) => {
  const mutationKey = [...mutationKeyBase, threadContext.variables]
  const messagesQueryKey = ['messages', threadContext.variables]

  return {
    mutationFn: async (variables: VariablesArgs) => {
      const response = await fetch(`${superinterfaceContext.baseUrl}${path}`, {
        method: 'POST',
        body: JSON.stringify(variables),
        credentials: 'include',
        ...(superinterfaceContext.publicApiKey ? {
          headers: {
            Authorization: `Bearer ${superinterfaceContext.publicApiKey}`,
          },
        } : {}),
      })

      if (response.body == null) {
        throw new Error('The response body is empty.');
      }

      const parser = new JSONParser({ stringBufferSize: undefined, paths: ['$'], separator: '' })
      const reader = response.body.pipeThrough(parser).getReader()

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        if (value.value.event === 'thread.message.created') {
          queryClient.setQueryData(
            messagesQueryKey,
            messageCreatedData({ message: value.value.data })
          )
        } else if (value.value.event === 'thread.message.delta') {
          queryClient.setQueryData(
            messagesQueryKey,
            messageDeltaData({ messageDelta: value.value.data })
          )
        } else if (value.value.event === 'thread.message.completed') {
          queryClient.setQueryData(
            messagesQueryKey,
            messageCompletedData({ message: value.value.data })
          )
        } else if (value.value.event === 'thread.run.created') {
          queryClient.setQueryData(
            messagesQueryKey,
            runCreatedData({ run: value.value.data })
          )
        } else if (value.value.event === 'thread.run.step.created') {
          queryClient.setQueryData(
            messagesQueryKey,
            runStepCreatedData({ runStep: value.value.data })
          )
        } else if (value.value.event === 'thread.run.step.delta') {
          queryClient.setQueryData(
            messagesQueryKey,
            runStepDeltaData({ runStepDelta: value.value.data })
          )
        } else if (value.value.event === 'thread.run.step.completed') {
          queryClient.setQueryData(
            messagesQueryKey,
            runStepCompletedData({ runStep: value.value.data })
          )
        } else {
          console.log({ value })
        }
      }
    },
    ...threadContext.defaultOptions.mutations,
    ...queryClient.getMutationDefaults(mutationKey),
    mutationKey,
  }
}
