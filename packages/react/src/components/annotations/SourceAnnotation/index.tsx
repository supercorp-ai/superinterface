import OpenAI from 'openai'
import {
  useMarkdownContext,
} from '@/hooks/markdown/useMarkdownContext'
import { FilePathAnnotation } from '@/components/annotations/FilePathAnnotation'
import { FileCitation } from './FileCitation'

export const SourceAnnotation = ({
  markdownContext,
  children,
  ...rest
}: {
  markdownContext: ReturnType<typeof useMarkdownContext>
  children: React.ReactNode
  ['data-annotation']: string
}) => {
  const annotation = JSON.parse(rest['data-annotation'] ?? '{}') as OpenAI.Beta.Threads.Messages.Annotation

  if (annotation.type === 'file_citation') {
    return (
      <FileCitation
        annotation={annotation}
      />
    )
  } else if (annotation.type === 'file_path') {
    return (
      <FilePathAnnotation
        annotation={annotation}
      >
        {children}
      </FilePathAnnotation>
    )
  }

  return null
}
