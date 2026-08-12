'use client'

import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Link } from '@/contexts/markdown/MarkdownContext/lib/components/Link'
import type { FilePathAnnotation as FilePathAnnotationType } from '@/types'
import { fileContentUrl, fileReference } from '@/lib/files/fileContentUrl'

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
    reference: fileReference({
      fileId: annotation.file_path.file_id,
      containerId: annotation.file_path.container_id,
    }),
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
