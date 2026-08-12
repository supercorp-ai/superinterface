'use client'

import type OpenAI from 'openai'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Link } from '@/contexts/markdown/MarkdownContext/lib/components/Link'
import { fileContentUrl } from '@/lib/files/fileContentUrl'

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
  const href = fileContentUrl({
    baseUrl: superinterfaceContext.baseUrl,
    variables: superinterfaceContext.variables,
    fileId: annotation.file_path.file_id,
    containerId: annotation.file_path.container_id,
  })

  return (
    <Link
      href={href}
      target="_self"
      download
    >
      {children}
    </Link>
  )
}
