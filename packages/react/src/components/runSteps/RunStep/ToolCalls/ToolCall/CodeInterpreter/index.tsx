import OpenAI from 'openai'
import {
  Popover,
  Flex,
} from '@radix-ui/themes'
import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'
import { ToolCallIcon } from '@/components/toolCalls/ToolCallBase/ToolCallIcon'
import type { SerializedRunStep } from '@/types'
import { Content } from './Content'

export const CodeInterpreter = ({
  codeInterpreter,
  runStep,
}: {
  codeInterpreter: OpenAI.Beta.Threads.Runs.CodeInterpreterToolCall.CodeInterpreter
  runStep: SerializedRunStep
}) => (
  <Popover.Root>
    <Popover.Trigger>
      <Flex>
        <ToolCallBase>
          <ToolCallIcon runStep={runStep} />
          <ToolCallTitle>
            Using code interpreter
          </ToolCallTitle>
        </ToolCallBase>
      </Flex>
    </Popover.Trigger>
    <Popover.Content
      maxHeight="200px"
    >
      <Content
        codeInterpreter={codeInterpreter}
      />
    </Popover.Content>
  </Popover.Root>
)
