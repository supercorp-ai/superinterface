import {
  QuoteIcon,
  FileIcon,
} from '@radix-ui/react-icons'
import OpenAI from 'openai'
import { AnnotationBase } from './AnnotationBase'

export const Annotation = ({
  annotation,
}: {
  annotation: OpenAI.Beta.Threads.Messages.Annotation
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
      <AnnotationBase
        icon={<FileIcon />}
        content="File generated."
      />
    )
  }

  return null
}
