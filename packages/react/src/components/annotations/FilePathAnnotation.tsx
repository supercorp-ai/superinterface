'use client'

import type OpenAI from 'openai'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Link } from '@/contexts/markdown/MarkdownContext/lib/components/Link'

type FilePathAnnotationType =
  OpenAI.Beta.Threads.Messages.FilePathAnnotation & {
    file_path: OpenAI.Beta.Threads.Messages.FilePathAnnotation['file_path'] & {
      container_id?: string
    }
  }

export const FilePathAnnotation = ({
  annotation,
  children,
}: {
  annotation: FilePathAnnotationType
  children: React.ReactNode
}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const searchParams = new URLSearchParams(superinterfaceContext.variables)
  if (annotation.file_path.container_id) {
    searchParams.set('containerId', annotation.file_path.container_id)
  }

  return (
    <Link
      href={`${superinterfaceContext.baseUrl}/files/${annotation.file_path.file_id}/contents?${searchParams}`}
      target="_self"
      download
    >
      {children}
    </Link>
  )
}
