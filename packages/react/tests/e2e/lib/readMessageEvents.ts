import { JSONParser } from '@streamparser/json-whatwg'

// Reads a POST /api/messages response body, a stream of concatenated JSON
// events, the way the client does.
export const readMessageEvents = async ({
  response,
}: {
  response: Response
}) => {
  const parser = new JSONParser({
    stringBufferSize: undefined,
    paths: ['$'],
    separator: '',
  })
  const reader = response.body!.pipeThrough(parser).getReader()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: { event: string; data: any }[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events.push(value.value as any)
  }

  return events
}
