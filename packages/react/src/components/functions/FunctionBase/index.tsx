import OpenAI from 'openai'
import {
  Popover,
} from '@radix-ui/themes'
import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'
import { Icon } from './Icon'
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
    <ToolCallBase>
      <Icon runStep={runStep} />
      <ToolCallTitle>
        {title}
      </ToolCallTitle>
    </ToolCallBase>
    <Popover.Content
      style={{
        maxHeight: '200px',
      }}
    >
      <Content fn={fn} />
    </Popover.Content>
  </Popover.Root>
)
