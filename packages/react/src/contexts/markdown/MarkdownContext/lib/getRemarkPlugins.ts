import OpenAI from 'openai'
import remarkGfm from 'remark-gfm'
import { remarkAnnotation } from '@/lib/remark/remarkAnnotation'

export const getRemarkPlugins = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => [
  remarkAnnotation({ content }),
  remarkGfm,
]
