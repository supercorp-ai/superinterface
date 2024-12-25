import OpenAI from 'openai'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Link } from '@/contexts/markdown/MarkdownContext/lib/components/Link'

export const FilePathAnnotation = ({
  annotation,
  children,
}: {
  annotation: OpenAI.Beta.Threads.Messages.FilePathAnnotation
  children: React.ReactNode
}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const nextSearchParams = new URLSearchParams(superinterfaceContext.variables)

  return (
    <Link
      href={`${superinterfaceContext.baseUrl}/files/${annotation.file_path.file_id}/contents?${nextSearchParams}`}
      target="_self"
      download
    >
      {children}
    </Link>
  )
}
