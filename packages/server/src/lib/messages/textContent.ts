import type OpenAI from 'openai'

export const textContent = ({
  message,
}: {
  message: OpenAI.Beta.Threads.Messages.Message
}) => {
  const textContents = message.content.filter(
    (content) => content.type === 'text',
  ) as OpenAI.Beta.Threads.Messages.TextContentBlock[]

  return textContents.map((textContent) => textContent.text.value).join('\n\n')
}
