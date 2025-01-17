import OpenAI from 'openai'
import { TextContent } from './TextContent'
import { ImageFileContent } from './ImageFileContent'

export const ContentPart = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.Message['content'][0]
}) => {
  if (content.type === 'text') {
    return (
      <TextContent
        content={content}
      />
    )
  }

  if (content.type === 'image_file') {
    return (
      <ImageFileContent
        content={content}
      />
    )
  }

  return null
}
