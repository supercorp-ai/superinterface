import { serializeMessage } from '@/lib/messages/serializeMessage'
import { serializeRun } from '@/lib/runs/serializeRun'
import { serializeRunStep } from '@/lib/runSteps/serializeRunStep'
import { enqueueJson } from '@/lib/streams/enqueueJson'
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
      enqueueJson({
        controller,
        value: {
          event: value.event,
          data: serializeMessage({
            message: value.data,
          }),
        },
      })
    } else if (['thread.message.delta', 'thread.run.step.delta'].includes(value.event)) {
      enqueueJson({
        controller,
        value,
      })
    } else if (value.event === 'thread.run.created') {
      enqueueJson({
        controller,
        value: {
          event: value.event,
          data: serializeRun({
            run: value.data,
          }),
        },
      })
    } else if (['thread.run.step.created', 'thread.run.step.completed'].includes(value.event)) {
      enqueueJson({
        controller,
        value: {
          event: value.event,
          data: serializeRunStep({
            runStep: value.data,
          }),
        },
      })
    } else if (value.event === 'thread.run.requires_action') {
      enqueueJson({
        controller,
        value,
      })

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
