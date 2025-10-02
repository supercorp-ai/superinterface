import type OpenAI from 'openai'
import { Image } from '@/components/images/Image'

export const ImageUrlContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.ImageURLContentBlock
}) => (
  <Image
    alt=""
    src={content.image_url.url}
  />
)
