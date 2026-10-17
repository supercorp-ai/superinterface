import { ModelProviderType, Prisma } from '@prisma/client'
import { SCREENSHOT_MEDIA_TYPE } from './constants'

// Anthropic expects base64 image blocks; every other provider gets a
// computer_screenshot JSON string.
export const serializeScreenshot = ({
  assistant,
  imageUrl,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      modelProvider: true
    }
  }>
  imageUrl: string
}) => {
  if (assistant.modelProvider.type === ModelProviderType.ANTHROPIC) {
    return [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: SCREENSHOT_MEDIA_TYPE,
          data: imageUrl.split(',')[1],
        },
      },
    ]
  }

  return JSON.stringify({
    type: 'computer_screenshot',
    image_url: imageUrl,
  })
}
