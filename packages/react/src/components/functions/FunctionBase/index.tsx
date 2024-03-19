import OpenAI from 'openai'
import {
  PopoverRoot,
  PopoverContent,
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
  <PopoverRoot>
    <ToolCallBase>
      <Icon runStep={runStep} />
      <ToolCallTitle>
        {title}
      </ToolCallTitle>
    </ToolCallBase>
    <PopoverContent
      style={{
        maxHeight: '200px',
      }}
    >
      <Content fn={fn} />
    </PopoverContent>
  </PopoverRoot>
)
