import OpenAI from 'openai'
import { useComponents } from '@/hooks/components/useComponents'

const TextContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  const {
    components: { TextContent },
  } = useComponents()

  return <TextContent content={content} />
}

const ImageFileContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.ImageFileContentBlock
}) => {
  const {
    components: { ImageFileContent },
  } = useComponents()

  return <ImageFileContent content={content} />
}

const ImageUrlContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.ImageFileContentBlock
}) => {
  const {
    components: { ImageUrlContent },
  } = useComponents()

  return <ImageUrlContent content={content} />
}

export const ContentPart = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.MessageContent
}) => {
  if (content.type === 'text') {
    return <TextContent content={content} />
  }

  if (content.type === 'image_file') {
    return <ImageFileContent content={content} />
  }

  if (content.type === 'image_url') {
    return <ImageUrlContent content={content} />
  }

  return null
}
