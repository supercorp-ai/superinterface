import { testApiHandler } from 'next-test-api-route-handler'
import { readMessageEvents, type MessageEvent } from './readMessageEvents'

type PostMessageResult = {
  status: number
  headers: Headers
  events: MessageEvent[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any
}

// POSTs to /api/messages. Successful runs stream back events; errors are JSON.
export const postMessage = async ({
  body,
}: {
  body: Record<string, unknown>
}): Promise<PostMessageResult> => {
  const appHandler = await import('../../../src/app/api/messages/route')
  let result: PostMessageResult | undefined

  await testApiHandler({
    appHandler,
    test: async ({ fetch }) => {
      const response = await fetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.status !== 200) {
        result = {
          status: response.status,
          headers: response.headers,
          events: [],
          json: await response.json(),
        }
        return
      }

      result = {
        status: response.status,
        headers: response.headers,
        events: await readMessageEvents({ response }),
        json: null,
      }
    },
  })

  return result!
}
