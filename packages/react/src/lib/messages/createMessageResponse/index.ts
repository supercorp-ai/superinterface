import { handleStream } from './handleStream'

type CallbackArgs = {
  controller: ReadableStreamDefaultController<Uint8Array>
}

export const createMessageResponse = ({
  client,
  createRunStream,
  handleToolCall,
  onStart = () => {},
  onError = () => {},
  onClose = () => {},
  onEvent = () => {},
}: {
  client: any
  createRunStream: any
  handleToolCall: any
  onStart?: (args: CallbackArgs) => void
  onError?: (args: CallbackArgs & { error: any }) => void
  onClose?: (args: CallbackArgs) => void
  onEvent?: (args: CallbackArgs & { event: string, data: any }) => void
}) => (
  new ReadableStream({
    async start(controller) {
      onStart({ controller })

      try {
        await handleStream({
          client,
          stream: createRunStream,
          controller,
          handleToolCall,
          onEvent,
        })
      } catch (error) {
        onError({ error, controller })
        controller.error(error)
      }

      onClose({ controller })
      controller.close()
    },
  })
)
