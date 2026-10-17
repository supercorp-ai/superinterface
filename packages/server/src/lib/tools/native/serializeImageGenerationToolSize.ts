import { ImageGenerationToolSize } from '@prisma/client'

const imageGenerationToolSizes = {
  [ImageGenerationToolSize.AUTO]: 'auto',
  [ImageGenerationToolSize.SIZE_1024_1024]: '1024x1024',
  [ImageGenerationToolSize.SIZE_1024_1536]: '1024x1536',
  [ImageGenerationToolSize.SIZE_1536_1024]: '1536x1024',
} as const satisfies Record<ImageGenerationToolSize, string>

export const serializeImageGenerationToolSize = ({
  size,
}: {
  size: ImageGenerationToolSize
}) => imageGenerationToolSizes[size]
