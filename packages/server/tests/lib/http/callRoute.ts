import {
  testApiHandler,
  type NtarhInitAppRouter,
} from 'next-test-api-route-handler'

type AppHandler = NtarhInitAppRouter['appHandler']

const parseBody = ({ text }: { text: string }) => {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Sends one request through a Next.js app route handler and returns the
// status, headers and parsed body.
export const callRoute = async ({
  appHandler,
  method,
  params,
  url,
  authorization,
  headers = {},
  body,
  rawBody,
}: {
  appHandler: AppHandler
  method: string
  params?: Record<string, string>
  url?: string
  authorization?: string
  headers?: Record<string, string>
  body?: unknown
  rawBody?: string
}) => {
  let result:
    | {
        status: number
        headers: Headers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json: any
      }
    | undefined

  const requestBody =
    rawBody ?? (body === undefined ? undefined : JSON.stringify(body))

  await testApiHandler({
    appHandler,
    params,
    url,
    test: async ({ fetch }) => {
      const response = await fetch({
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {}),
          ...headers,
        },
        ...(requestBody === undefined ? {} : { body: requestBody }),
      })
      result = {
        status: response.status,
        headers: response.headers,
        json: parseBody({ text: await response.text() }),
      }
    },
  })

  if (!result) throw new Error('Route was not called')
  return result
}
