import type { Prisma } from '@prisma/client'

export const apiAssistantInclude = {
  tools: true,
  avatar: {
    include: {
      imageAvatar: true,
      iconAvatar: true,
    },
  },
} satisfies Prisma.AssistantInclude
