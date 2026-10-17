import type OpenAI from 'openai'
import { FilePathAnnotation } from '@/components/annotations/FilePathAnnotation'
import { FileCitation } from './FileCitation'

export const SourceAnnotation = ({
  children,
  ...rest
}: {
  children: React.ReactNode
  ['data-annotation']: string
}) => {
  const annotation = JSON.parse(
    rest['data-annotation'] ?? '{}',
  ) as OpenAI.Beta.Threads.Messages.Annotation

  if (annotation.type === 'file_citation') {
    return <FileCitation annotation={annotation} />
  }

  return annotation.type === 'file_path' ? (
    <FilePathAnnotation annotation={annotation}>{children}</FilePathAnnotation>
  ) : null
}
