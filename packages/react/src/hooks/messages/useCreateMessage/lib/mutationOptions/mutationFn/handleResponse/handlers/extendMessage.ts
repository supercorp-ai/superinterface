import { last } from 'radash'
import { SerializedMessage } from '@/types'
import { isOptimistic } from '@/lib/optimistic/isOptimistic'

export const extendMessage = ({
  message,
  messages,
}: {
  message: SerializedMessage
  messages: SerializedMessage[]
}) => {
  const prevRunMessages = messages.filter((m: SerializedMessage) => (
    m.run_id === message.run_id
  ))

  const prevOptimitisticRunMessages = prevRunMessages.filter((m: SerializedMessage) => (
    isOptimistic({ id: m.id })
  ))

  const runSteps = last(prevOptimitisticRunMessages)?.runSteps ?? last(prevRunMessages)?.runSteps ?? []

  return {
    ...message,
    runSteps,
  }
}
