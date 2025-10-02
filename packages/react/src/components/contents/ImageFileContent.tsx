import type OpenAI from 'openai'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { Image } from '@/components/images/Image'

export const ImageFileContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.ImageFileContentBlock
}) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const nextSearchParams = new URLSearchParams(superinterfaceContext.variables)

  return (
    <Image
      alt=""
      src={`${superinterfaceContext.baseUrl}/files/${content.image_file.file_id}/contents?${nextSearchParams}`}
    />
  )
}
