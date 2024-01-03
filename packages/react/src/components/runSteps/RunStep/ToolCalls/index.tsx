import OpenAI from 'openai'
import {
  Flex,
} from '@radix-ui/themes'
import { ToolCall } from './ToolCall'
import { Starting } from './Starting'

type Args = {
  stepDetails: OpenAI.Beta.Threads.Runs.ToolCallsStepDetails
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const ToolCalls = ({
  stepDetails,
  runStep,
}: Args) => (
  <Flex
    direction="column"
  >
    {!stepDetails.tool_calls.length && (
      <Starting />
    )}
    {stepDetails.tool_calls.map((toolCall) => (
      <ToolCall
        key={toolCall.id}
        toolCall={toolCall}
        runStep={runStep}
      />
    ))}
  </Flex>
)
