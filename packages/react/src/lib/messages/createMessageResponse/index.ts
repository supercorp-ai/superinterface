import { handleStream } from './handleStream'

type CallbackArgs = {
  controller: ReadableStreamDefaultController<Uint8Array>
}

export const createMessageResponse = ({
  client,
  createRunStream,
  handleToolCall,
  onStart = () => {},
  onClose = () => {},
}: {
  client: any
  createRunStream: any
  handleToolCall: any
  onStart?: (args: CallbackArgs) => void
  onClose?: (args: CallbackArgs) => void
}) => (
  new ReadableStream({
    async start(controller) {
      onStart({ controller })

      await handleStream({
        client,
        stream: createRunStream,
        controller,
        handleToolCall,
      })

      console.log('Stream ended')
      onClose({ controller })
      controller.close()
    },
  })
)
