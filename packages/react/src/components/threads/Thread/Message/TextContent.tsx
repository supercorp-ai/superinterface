import OpenAI from 'openai'
import { useRemarkSync } from 'react-remark'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'

type Args = {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}

export const TextContent = ({
  content,
}: Args) => {
  const markdownContext = useMarkdownContext()

  return useRemarkSync(content.text.value, markdownContext)
}
