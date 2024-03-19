import { last } from 'radash'
import { Message } from '@superinterface/react/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

export const extendMessage = ({
  message,
  messages,
}: {
  message: Message
  messages: Message[]
}) => {
  const prevRunMessages = messages.filter((m: Message) => (
    m.run_id === message.run_id
  ))

  const prevOptimitisticRunMessages = prevRunMessages.filter((m: Message) => (
    isOptimistic({ id: m.id })
  ))

  const runSteps = last(prevOptimitisticRunMessages)?.runSteps ?? last(prevRunMessages)?.runSteps ?? []

  return {
    ...message,
    runSteps,
  }
}
