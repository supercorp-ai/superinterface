import {
  PopoverRoot,
  PopoverContent,
  Text,
} from '@radix-ui/themes'
import {
  CircleIcon,
} from '@radix-ui/react-icons'
import { ToolCallBase } from '@/components/toolCalls/ToolCallBase'
import { ToolCallTitle } from '@/components/toolCalls/ToolCallBase/ToolCallTitle'

export const Starting = () => (
  <PopoverRoot>
    <ToolCallBase>
      <CircleIcon />
      <ToolCallTitle>
        Starting actions
      </ToolCallTitle>
    </ToolCallBase>
    <PopoverContent
      style={{
        maxHeight: '500px',
      }}
    >
      <Text>
        Getting ready to connect to domain API
      </Text>
    </PopoverContent>
  </PopoverRoot>
)
