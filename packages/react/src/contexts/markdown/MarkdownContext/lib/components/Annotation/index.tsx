import { QuoteIcon } from '@radix-ui/react-icons'
import { FilePathAnnotation } from '@/components/annotations/FilePathAnnotation'
import { AnnotationBase } from './AnnotationBase'
import type { MessageAnnotation } from '@/types'

export const Annotation = ({
  children,
  ...rest
}: {
  children: React.ReactNode
  ['data-annotation']: string
}) => {
  const annotation = JSON.parse(
    rest['data-annotation'] ?? '{}',
  ) as MessageAnnotation

  if (annotation.type === 'file_citation') {
    return (
      <AnnotationBase
        icon={<QuoteIcon />}
        content="File cited."
      />
    )
  } else if (annotation.type === 'file_path') {
    return (
      <FilePathAnnotation annotation={annotation}>
        {children}
      </FilePathAnnotation>
    )
  }

  return null
}
