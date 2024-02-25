import { useContext } from 'react'
import OpenAI from 'openai'
import { useRemarkSync } from 'react-remark'
import { MarkdownContext } from '@/contexts/markdown/MarkdownContext'

type Args = {
  content: OpenAI.Beta.Threads.Messages.MessageContentText
}

export const TextContent = ({
  content,
}: Args) => {
  const markdownContext = useContext(MarkdownContext)

  return useRemarkSync(content.text.value, markdownContext)
}
