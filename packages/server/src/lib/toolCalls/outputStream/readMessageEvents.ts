import type OpenAI from 'openai'

// Decodes each chunk of a createMessageResponse stream as one JSON event.
export async function* readMessageEvents({
  messageResponse,
}: {
  messageResponse: ReadableStream<Uint8Array>
}): AsyncGenerator<OpenAI.Beta.AssistantStreamEvent> {
  // @ts-expect-error unclear type
  for await (const value of messageResponse) {
    yield JSON.parse(Buffer.from(value).toString('utf-8'))
  }
}
