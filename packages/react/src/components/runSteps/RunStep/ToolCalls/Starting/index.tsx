import {
  Popover,
  Text,
} from '@radix-ui/themes'
import {
  CircleIcon,
} from '@radix-ui/react-icons'
import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'

export const Starting = () => (
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
        Getting ready to connect to domain API
      </Text>
    </Popover.Content>
  </Popover.Root>
)
