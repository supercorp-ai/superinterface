import OpenAI from 'openai'
import Markdown from 'react-markdown'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'

type Args = {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}

export const TextContent = ({
  content,
}: Args) => {
  const markdownContext = useMarkdownContext()

  return (
    <Markdown {...markdownContext}>
      {content.text.value}
    </Markdown>
  )
}
