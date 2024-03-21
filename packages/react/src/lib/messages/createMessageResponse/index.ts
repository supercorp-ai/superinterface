import { handleStream } from './handleStream'

export const createMessageResponse = ({
  client,
  createRunStream,
  handleToolCall,
}: {
  client: any
  createRunStream: any
  handleToolCall: any
}) => (
  new ReadableStream({
    async start(controller) {
      await handleStream({
        client,
        stream: createRunStream,
        controller,
        handleToolCall,
      })

      console.log('Stream ended')
      controller.close()
    },
  })
)
