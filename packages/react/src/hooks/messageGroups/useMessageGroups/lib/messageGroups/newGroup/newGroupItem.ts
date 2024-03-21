import { SerializedMessage } from '@/types'

type Args = {
  message: SerializedMessage
}

export const newGroupItem = ({ message }: Args) => ({
  id: message.id,
  role: message.role,
  createdAt: message.created_at,
  messages: [message],
})
