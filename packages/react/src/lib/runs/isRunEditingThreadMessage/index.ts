import OpenAI from 'openai'
import _ from 'lodash'

type Args = {
  threadMessage: OpenAI.Beta.Threads.ThreadMessage
}

export const isRunEditingThreadMessage = ({
  threadMessage,
}: Args) => {
  if (!threadMessage) return false
  if (threadMessage.role === 'user') return false
  if (!threadMessage.run_id) return false

  const hasContent = _.some(threadMessage.content, (content) => (
    content.type !== 'text' ||
      (content.type === 'text' && content.text?.value !== '')
  ))

  return !hasContent
}
