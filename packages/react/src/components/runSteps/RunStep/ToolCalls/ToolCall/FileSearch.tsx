import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'
import { ToolCallIcon } from '@/components/toolCalls/ToolCallBase/ToolCallIcon'
import type { SerializedRunStep, ToolCall } from '@/types'

export const FileSearch = ({
  runStep,
  toolCall,
}: {
  toolCall: ToolCall
  runStep: SerializedRunStep
}) => (
  <ToolCallBase>
    <ToolCallIcon runStep={runStep} />
    <ToolCallTitle>
      Searching files
    </ToolCallTitle>
  </ToolCallBase>
)
