import {
  QuoteIcon,
} from '@radix-ui/react-icons'
import OpenAI from 'openai'
import { AnnotationBase } from './AnnotationBase'
import { FilePathAnnotation } from './FilePathAnnotation'

export const Annotation = ({
  annotation,
  children,
}: {
  annotation: OpenAI.Beta.Threads.Messages.Annotation
  children: React.ReactNode
}) => {
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
