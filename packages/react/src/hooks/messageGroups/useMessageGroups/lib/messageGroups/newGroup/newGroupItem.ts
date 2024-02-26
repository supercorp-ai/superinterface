import { Message } from '@/types'

type Args = {
  message: Message
}

export const newGroupItem = ({ message }: Args) => ({
  id: message.id,
  role: message.role,
  createdAt: message.created_at,
  messages: [message],
})
