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
  onEvent = () => {},
}: {
  client: any
  createRunStream: any
  handleToolCall: any
  onStart?: (args: CallbackArgs) => void
  onClose?: (args: CallbackArgs) => void
  onEvent?: (args: CallbackArgs & { event: string, data: any }) => void
}) => (
  new ReadableStream({
    async start(controller) {
      onStart({ controller })

      await handleStream({
        client,
        stream: createRunStream,
        controller,
        handleToolCall,
        onEvent,
      })

      console.log('Stream ended')
      onClose({ controller })
      controller.close()
    },
  })
)
