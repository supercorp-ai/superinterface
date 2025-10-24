import { Prisma } from '@prisma/client'
import { formatName } from '@/lib/assistants/formatName'
import { serializeTheme } from '@/lib/themes/serializeTheme'
import { serializeAvatar } from '@/lib/avatars/serializeAvatar'
import { defaultAvatar } from '@/lib/avatars/defaultAvatar'
import { defaultTheme } from '@/lib/themes/defaultTheme'

export const serializeAssistant = ({
  assistant,
}: {
  assistant: Prisma.AssistantGetPayload<{
    include: {
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
  name: formatName({ name: assistant.name }),
  description: assistant.description,
  theme: serializeTheme({
    theme: defaultTheme,
  }),
  avatar: serializeAvatar({
    avatar: assistant.avatar ?? defaultAvatar,
  }),
})
