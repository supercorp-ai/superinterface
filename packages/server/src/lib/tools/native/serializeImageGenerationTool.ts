import type { Prisma, StorageProviderType } from '@prisma/client'
import type OpenAI from 'openai'
import { isResponsesStorageProvider } from '@/lib/storageProviders/isResponsesStorageProvider'
import { serializeImageGenerationToolSize } from '@/lib/tools/native/serializeImageGenerationToolSize'

type ImageGeneration = OpenAI.Responses.Tool.ImageGeneration

export const serializeImageGenerationTool = ({
  tool,
  storageProviderType,
}: {
  tool: Prisma.ToolGetPayload<{ include: { imageGenerationTool: true } }>
  storageProviderType: StorageProviderType
}) => {
  if (!isResponsesStorageProvider({ storageProviderType })) {
    return []
  }

  const imageGenerationTool = tool.imageGenerationTool!

  return {
    type: 'image_generation' as const,
    image_generation: {
      model: imageGenerationTool.model,
      background:
        imageGenerationTool.background.toLowerCase() as ImageGeneration['background'],
      quality:
        imageGenerationTool.quality.toLowerCase() as ImageGeneration['quality'],
      output_format:
        imageGenerationTool.outputFormat.toLowerCase() as ImageGeneration['output_format'],
      size: serializeImageGenerationToolSize({
        size: imageGenerationTool.size,
      }),
      partial_images: imageGenerationTool.partialImages,
    },
  }
}
