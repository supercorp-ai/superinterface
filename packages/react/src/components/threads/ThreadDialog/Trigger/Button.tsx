import {
  IconButton,
} from '@radix-ui/themes'
import {
  ChatBubbleIcon,
} from '@radix-ui/react-icons'
import type { StyleProps } from '@/types'

export const Button = (props: StyleProps) => (
  <IconButton
    size="4"
    radius="full"
    {...props}
  >
    <ChatBubbleIcon />
  </IconButton>
)
