import OpenAI from 'openai'
import {
  Flex,
} from '@radix-ui/themes'
import type { SerializedRunStep, StyleProps } from '@/types'
import { ToolCall } from './ToolCall'
import { Starting } from './Starting'

type Args = {
  stepDetails: OpenAI.Beta.Threads.Runs.ToolCallsStepDetails
  runStep: SerializedRunStep
} & StyleProps

const Root = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode
} & StyleProps) => (
  <Flex
    direction="column"
    className={className}
    style={style}
  >
    {children}
  </Flex>
)

export const ToolCalls = ({
  stepDetails,
  runStep,
  className,
  style,
}: Args) => (
  <Root
    className={className}
    style={style}
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
  </Root>
)

ToolCalls.Root = Root
ToolCalls.Starting = Starting
ToolCalls.ToolCall = ToolCall
