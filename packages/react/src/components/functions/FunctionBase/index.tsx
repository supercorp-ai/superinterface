import OpenAI from 'openai'
import {
  Popover,
  Flex,
} from '@radix-ui/themes'
import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'
import { ToolCallIcon } from '@/components/toolCalls/ToolCallBase/ToolCallIcon'
import { Content } from './Content'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: OpenAI.Beta.Threads.Runs.RunStep
  title: string
}

export const FunctionBase = ({
  fn,
  runStep,
  title,
}: Args) => (
  <Popover.Root>
    <Popover.Trigger>
      <Flex>
        <ToolCallBase>
          <ToolCallIcon runStep={runStep} />
          <ToolCallTitle>
            {title}
          </ToolCallTitle>
        </ToolCallBase>
      </Flex>
    </Popover.Trigger>
    <Popover.Content
      style={{
        maxHeight: '200px',
      }}
    >
      <Content fn={fn} />
    </Popover.Content>
  </Popover.Root>
)
