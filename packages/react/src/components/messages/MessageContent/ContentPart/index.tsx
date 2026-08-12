import type OpenAI from 'openai'
import { useComponents } from '@/hooks/components/useComponents'
import type {
  ImageFileContentBlock as ImageFileContentBlockType,
  MessageContent,
  TextContentBlock as TextContentBlockType,
} from '@/types'

const TextContent = ({ content }: { content: TextContentBlockType }) => {
  const {
    components: { TextContent },
  } = useComponents()

  return <TextContent content={content} />
}

const ImageFileContent = ({
  content,
}: {
  content: ImageFileContentBlockType
}) => {
  const {
    components: { ImageFileContent },
  } = useComponents()

  return <ImageFileContent content={content} />
}

const ImageUrlContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.ImageURLContentBlock
}) => {
  const {
    components: { ImageUrlContent },
  } = useComponents()

  return <ImageUrlContent content={content} />
}

export const ContentPart = ({ content }: { content: MessageContent }) => {
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
