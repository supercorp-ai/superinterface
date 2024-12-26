import {
  QuoteIcon,
} from '@radix-ui/react-icons'
import OpenAI from 'openai'
import { FilePathAnnotation } from '@/components/annotations/FilePathAnnotation'
import { AnnotationBase } from './AnnotationBase'

export const Annotation = ({
  children,
  ...rest
}: {
  ['data-annotation']: string
  children: React.ReactNode
}) => {
  const annotation = JSON.parse(rest['data-annotation'] ?? '{}') as OpenAI.Beta.Threads.Messages.Annotation

  if (annotation.type === 'file_citation') {
    return (
      <AnnotationBase
        icon={<QuoteIcon />}
        content="File cited."
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
