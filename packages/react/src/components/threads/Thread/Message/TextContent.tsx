import OpenAI from 'openai'
import Markdown from 'react-markdown'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'

type Args = {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}

export const TextContent = ({
  content,
}: Args) => {
  const {
    getRemarkPlugins,
    ...rest
  } = useMarkdownContext()

  return (
    <Markdown
      {...rest}
      remarkPlugins={getRemarkPlugins({
        content,
      })}
    >
      {content.text.value}
    </Markdown>
  )
}
