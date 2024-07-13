import OpenAI from 'openai'
import { remarkAnnotation } from '@/lib/remark/remarkAnnotation'

export const getRemarkPlugins = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => [
  remarkAnnotation({ content }),
]
