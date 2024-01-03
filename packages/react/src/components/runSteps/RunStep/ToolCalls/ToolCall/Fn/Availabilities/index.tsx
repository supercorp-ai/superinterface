import OpenAI from 'openai'
import {
  PopoverRoot,
  PopoverContent,
} from '@radix-ui/themes'
import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'
import { Icon } from '../Icon'
import { Content } from '../Content'
import { Title } from './Title'

type Args = {
  fn: OpenAI.Beta.Threads.Runs.FunctionToolCall.Function
  runStep: OpenAI.Beta.Threads.Runs.RunStep
}

export const Availabilities = ({
  fn,
  runStep,
}: Args) => (
  <PopoverRoot>
    <ToolCallBase>
      <Icon runStep={runStep} />
      <ToolCallTitle>
        <Title runStep={runStep} />
      </ToolCallTitle>
    </ToolCallBase>
    <PopoverContent
      className="max-h-[500px]"
    >
      <Content fn={fn} />
    </PopoverContent>
  </PopoverRoot>
)
