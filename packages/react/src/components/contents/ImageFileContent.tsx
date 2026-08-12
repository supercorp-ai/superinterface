import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Image } from '@/components/images/Image'
import type { ImageFileContentBlock } from '@/types'
import { fileContentUrl, fileReference } from '@/lib/files/fileContentUrl'

export const ImageFileContent = ({
  content,
}: {
  content: ImageFileContentBlock
}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const src = fileContentUrl({
    baseUrl: superinterfaceContext.baseUrl,
    variables: superinterfaceContext.variables,
    reference: fileReference({
      fileId: content.image_file.file_id,
      containerId: content.image_file.container_id,
    }),
  })

  return (
    <Image
      alt=""
      src={src}
    />
  )
}
