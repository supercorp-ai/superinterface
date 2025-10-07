import type { Prisma } from '@prisma/client'
import { ToolType } from '@prisma/client'
import { serializeAvatar } from '@/lib/avatars/serializeAvatar'
import { defaultAvatar } from '@/lib/avatars/defaultAvatar'

export const serializeApiAssistant = ({
  assistant,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
      tools: true
      avatar: {
        include: {
          iconAvatar: true
          imageAvatar: true
        }
      }
    }
  }>
}) => ({
  id: assistant.id,
  storageProviderType: assistant.storageProviderType,
  storageProviderAssistantId: assistant.openaiAssistantId,
  modelProviderId: assistant.modelProviderId,
  model: assistant.modelSlug,
  name: assistant.name,
  description: assistant.description,
  instructions: assistant.instructions,
  codeInterpreterEnabled: assistant.tools.some(
    (tool) => tool.type === ToolType.CODE_INTERPRETER,
  ),
  fileSearchEnabled: assistant.tools.some(
    (tool) => tool.type === ToolType.FILE_SEARCH,
  ),
  createdAt: assistant.createdAt.toISOString(),
  updatedAt: assistant.updatedAt.toISOString(),
  avatar: serializeAvatar({
    avatar: assistant.avatar ?? defaultAvatar,
  }),
})
