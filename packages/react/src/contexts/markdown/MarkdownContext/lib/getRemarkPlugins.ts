import remarkGfm from 'remark-gfm'
import { remarkAnnotation } from '@/lib/remark/remarkAnnotation'
import { remarkPureLiteralPlugin } from '@/lib/remark/remarkPureLiteralPlugin'
import type { TextContentBlock } from '@/types'

export const getRemarkPlugins = ({
  content,
}: {
  content: TextContentBlock
}) => [remarkPureLiteralPlugin, remarkAnnotation({ content }), remarkGfm]
