import { useMemo } from 'react'
import { MarkdownContext, type MarkdownContextType } from '@/contexts/markdown/MarkdownContext'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'
import { merge } from '@/lib/misc/merge'

export const MarkdownProvider = ({
  children,
  ...rest
}: {
  children: React.ReactNode
} & Partial<MarkdownContextType>) => {
  const prevMarkdownContext = useMarkdownContext()

  const value = useMemo(() => (
    merge(prevMarkdownContext, rest)
  ), [rest, prevMarkdownContext])

  return (
    <MarkdownContext.Provider
      value={value}
    >
      {children}
    </MarkdownContext.Provider>
  )
}
