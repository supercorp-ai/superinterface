import { handleStream } from './handleStream'

export const createMessageResponse = ({
  client,
  createRunStream,
  handleToolCall,
  onClose = () => {},
}: {
  client: any
  createRunStream: any
  handleToolCall: any
  onClose?: () => void
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
      onClose()
      controller.close()
    },
  })
)
