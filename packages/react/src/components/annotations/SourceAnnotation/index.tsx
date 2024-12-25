import OpenAI from 'openai'
import {
  useMarkdownContext,
} from '@/hooks/markdown/useMarkdownContext'
import { FilePathAnnotation } from '@/components/annotations/FilePathAnnotation'
import { FileCitation } from './FileCitation'

export const SourceAnnotation = ({
  annotation,
  markdownContext,
  children,
}: {
  annotation: OpenAI.Beta.Threads.Messages.Annotation
  markdownContext: ReturnType<typeof useMarkdownContext>
  children: React.ReactNode
}) => {
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
