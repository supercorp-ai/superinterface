import { ThreadMessage } from '@/types'

type Args = {
  threadMessage: ThreadMessage
}

export const newGroupItem = ({ threadMessage }: Args) => ({
  id: threadMessage.id,
  role: threadMessage.role,
  createdAt: threadMessage.created_at,
  threadMessages: [threadMessage],
})
