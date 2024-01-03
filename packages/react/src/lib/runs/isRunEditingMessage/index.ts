import OpenAI from 'openai'
import _ from 'lodash'

type Args = {
  message: OpenAI.Beta.Threads.ThreadMessage
}

export const isRunEditingMessage = ({
  message,
}: Args) => {
  if (!message) return false
  if (message.role === 'user') return false
  if (!message.run_id) return false

  const hasContent = _.some(message.content, (content) => (
    content.type !== 'text' ||
      (content.type === 'text' && content.text?.value !== '')
  ))

  return !hasContent
}
