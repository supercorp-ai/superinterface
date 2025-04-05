import OpenAI from 'openai'

export const TextContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  return content.text.value
}
