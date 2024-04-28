import OpenAI from 'openai'
import {
  Flex,
} from '@radix-ui/themes'
import type { SerializedRunStep } from '@/types'
import { ToolCall } from './ToolCall'
import { Starting } from './Starting'

type Args = {
  stepDetails: OpenAI.Beta.Threads.Runs.ToolCallsStepDetails
  runStep: SerializedRunStep
}

const Root = ({
  children,
}: {
  children: React.ReactNode
}) => (
  <Flex
    direction="column"
  >
    {children}
  </Flex>
)

export const ToolCalls = ({
  stepDetails,
  runStep,
}: Args) => (
  <Root>
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
  </Root>
)

ToolCalls.Root = Root
ToolCalls.Starting = Starting
ToolCalls.ToolCall = ToolCall
