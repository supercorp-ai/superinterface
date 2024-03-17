import _ from 'lodash'
import {
  useQueryClient,
} from '@tanstack/react-query'
// import { JSONParser } from '@streamparser/json'
import { JSONParser } from '@streamparser/json-whatwg'
import { omit } from 'radash'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { useThreadContext } from '@/hooks/threads/useThreadContext'

type VariablesArgs = {
  content: string
  [key: string]: any
}

const messageCreatedData = ({
  newMessage,
}: {
  newMessage: any
}) => (prevData: any) => {
  const message = {
    ...newMessage,
    runSteps: [],
  }

  if (!prevData) {
    return {
      pageParams: [],
      pages: [
        {
          data: [message],
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
        data: [
          message,
          ...latestPage.data,
        ],
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

  console.log('here', { prevContentPart, delta })

  const part= {
    ...prevContentPart,
    text: {
      ...prevContentPart.text,
    }
  }
  console.log({ part })

  console.log({ prevContentPart })
  console.log({t: prevContentPart.text })
  console.log({v: prevContentPart.text.value })
  console.log({an: prevContentPart.text.annotations })

  console.log({delta})
  console.log({dt: delta.text })
  console.log({dv: delta.text.value })
  console.log({dan: delta.text.annotations })

  const r= {
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

  console.log({ r })
  return r
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

  console.log({ result, messageDelta })

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

      // const reader = response.body.getReader()

      const parser = new JSONParser({ stringBufferSize: undefined, paths: ['$'], separator: '' })
      // parser.onValue = (value, key, parent, stack) => {
      //   console.log({ value, key, parent, stack })
      //
      //   if (stack > 0) return; // ignore inner values
      //   // TODO process element
      // };
      // const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()

      const reader = response.body.pipeThrough(parser).getReader()
      // const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) break
        // if (value.stack.length) continue

        console.log({ value })
        if (value.value.event === 'thread.message.created') {
          queryClient.setQueryData(
            messagesQueryKey,
            messageCreatedData({ newMessage: value.value.data })
          )
        } else if (value.value.event === 'thread.message.delta') {
          queryClient.setQueryData(
            messagesQueryKey,
            messageDeltaData({ messageDelta: value.value.data })
          )
        }

        // try {
        //   parser.write(value)
        // } catch (error) {
        //   console.error({ error, value })
        //   // throw new Error('Failed to parse')
        // }

        // console.log({ value })
        //
        // // const decoded = decoder.decode(value)
        // let parsed
        // //
        // try {
        //   parsed = JSON.parse(value)
        //   console.log({ parsed })
        // } catch (error) {
        //   console.error({ error, value })
        //   throw new Error('Failed to parse')
        // }

        // // result += decoded
        //
        // console.dir({ value, decoded, parsed }, { depth: null })
      }

      // result += decoder.decode()
      // console.log({ result })

      //   .then(async (response) => {
      //   if (response.status !== 200) {
      //     let errorResponse
      //
      //     try {
      //       console.log('response', response)
      //       errorResponse = await response.json() as { error: string }
      //     } catch (error) {
      //       throw new Error('Failed to fetch')
      //     }
      //
      //     throw new Error(errorResponse.error)
      //   }
      //
      //   return response.json()
      // })
    },
    ...threadContext.defaultOptions.mutations,
    ...queryClient.getMutationDefaults(mutationKey),
    mutationKey,
  }
}
