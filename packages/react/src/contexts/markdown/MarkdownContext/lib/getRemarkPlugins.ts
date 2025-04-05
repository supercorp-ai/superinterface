import OpenAI from 'openai'
import remarkGfm from 'remark-gfm'
import { remarkAnnotation } from '@/lib/remark/remarkAnnotation'
import { remarkPureLiteralPlugin } from '@/lib/remark/remarkPureLiteralPlugin'

export const getRemarkPlugins = ({
  content,
}: {
  content:
    | OpenAI.Beta.Threads.Messages.Message['content'][number]
    | OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  const textContentBlock = content.type === 'text' ? content : null
  return [
    remarkPureLiteralPlugin,
    ...(textContentBlock
      ? [remarkAnnotation({ content: textContentBlock })]
      : []),
    remarkGfm,
  ]
}
