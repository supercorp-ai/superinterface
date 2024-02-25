import {
  IconButton,
} from '@radix-ui/themes'
import {
  ChatBubbleIcon,
} from '@radix-ui/react-icons'

export const Button = () => (
  <IconButton
    size="4"
    radius="full"
  >
    <ChatBubbleIcon />
  </IconButton>
)
