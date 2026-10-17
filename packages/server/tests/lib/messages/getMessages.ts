import { testApiHandler } from 'next-test-api-route-handler'

// GETs /api/messages with the given query parameters.
export const getMessages = async ({
  query,
}: {
  query: Record<string, string>
}) => {
  const appHandler = await import('../../../src/app/api/messages/route')
  const search = new URLSearchParams(query).toString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: { status: number; headers: Headers; json: any } | undefined

  await testApiHandler({
    appHandler,
    url: `/api/messages?${search}`,
    test: async ({ fetch }) => {
      const response = await fetch({ method: 'GET' })
      result = {
        status: response.status,
        headers: response.headers,
        json: await response.json(),
      }
    },
  })

  return result!
}
