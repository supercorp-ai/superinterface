import type { Plugin } from 'unified'
import { MarkdownProvider } from '@/components/markdown/MarkdownProvider'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'

// Runs `plugin` after the remark plugins the surrounding markdown context
// already gives replies.
export const WithRemarkPlugin = ({
  plugin,
  children,
}: {
  plugin: Plugin
  children: React.ReactNode
}) => {
  const { getRemarkPlugins } = useMarkdownContext()

  return (
    <MarkdownProvider
      getRemarkPlugins={(args) => [...getRemarkPlugins(args), plugin]}
    >
      {children}
    </MarkdownProvider>
  )
}
