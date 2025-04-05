import OpenAI from 'openai'
import { useCreateMMDXComp } from '@/hooks/markdown/useCreateMMDXComp'
import { TextContent } from './TextContent'
import { ImageFileContent } from './ImageFileContent'

export const ContentPart = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.Message['content'][0]
}) => {
  const MDXComponent = useCreateMMDXComp({ content })

  let fallbackCom: React.ReactNode = null
  if (content.type === 'text') {
    fallbackCom = <TextContent content={content} />
  }

  if (content.type === 'image_file') {
    fallbackCom = <ImageFileContent content={content} />
  }

  return MDXComponent || fallbackCom
}
