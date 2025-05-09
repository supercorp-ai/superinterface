import {
  Popover,
  Text,
} from '@radix-ui/themes'
import {
  CircleIcon,
} from '@radix-ui/react-icons'
import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'

export const StartingToolCalls = () => (
  <Popover.Root>
    <ToolCallBase>
      <CircleIcon />
      <ToolCallTitle>
        Starting actions
      </ToolCallTitle>
    </ToolCallBase>
    <Popover.Content
      style={{
        maxHeight: '500px',
      }}
    >
      <Text>
        Starting some actions
      </Text>
    </Popover.Content>
  </Popover.Root>
)
