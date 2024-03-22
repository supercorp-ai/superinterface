import { serializeMessage } from '@/lib/messages/serializeMessage'
import { serializeRun } from '@/lib/runs/serializeRun'
import { serializeRunStep } from '@/lib/runSteps/serializeRunStep'
import { actionsStream } from './actionsStream'

export const handleStream = async ({
  client,
  stream,
  controller,
  handleToolCall,
}: {
  client: any
  stream: ReadableStream
  controller: ReadableStreamDefaultController
  handleToolCall: any
}) => {
  for await (const value of stream) {
    if (['thread.message.created', 'thread.message.completed'].includes(value.event)) {
      controller.enqueue(JSON.stringify({
        event: value.event,
        data: serializeMessage({
          message: value.data,
        }),
      }))
    } else if (['thread.message.delta', 'thread.run.step.delta'].includes(value.event)) {
      controller.enqueue(JSON.stringify(value))
    } else if (value.event === 'thread.run.created') {
      controller.enqueue(JSON.stringify({
        event: value.event,
        data: serializeRun({
          run: value.data,
        }),
      }))
    } else if (['thread.run.step.created', 'thread.run.step.completed'].includes(value.event)) {
      controller.enqueue(JSON.stringify({
        event: value.event,
        data: serializeRunStep({
          runStep: value.data,
        }),
      }))
    } else if (value.event === 'thread.run.requires_action') {
      controller.enqueue(JSON.stringify(value))

      await handleStream({
        client,
        stream: await actionsStream({
          client,
          run: value.data,
          handleToolCall,
        }),
        controller,
        handleToolCall,
      })
    } else {
      console.dir({ value }, { depth: null })
    }
  }
}
