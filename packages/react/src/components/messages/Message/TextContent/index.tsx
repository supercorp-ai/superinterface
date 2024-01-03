import { useContext } from 'react'
import OpenAI from 'openai'
import Markdown from 'react-markdown'
import { MarkdownContext } from '@/contexts/markdown/MarkdownContext'

type Args = {
  content: OpenAI.Beta.Threads.Messages.MessageContentText
}

export const TextContent = ({
  content,
}: Args) => {
  const markdownContext = useContext(MarkdownContext)

  return (
    <Markdown
      {...markdownContext}
    >
      {content.text.value}
    </Markdown>
  )
}
