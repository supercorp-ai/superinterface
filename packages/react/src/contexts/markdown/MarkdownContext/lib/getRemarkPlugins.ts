import type OpenAI from 'openai'
import remarkGfm from 'remark-gfm'
import { remarkAnnotation } from '@/lib/remark/remarkAnnotation'
import { remarkPureLiteralPlugin } from '@/lib/remark/remarkPureLiteralPlugin'

export const getRemarkPlugins = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => [remarkPureLiteralPlugin, remarkAnnotation({ content }), remarkGfm]
