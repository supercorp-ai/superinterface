import type { InitialMessage } from '@prisma/client'

export const serializeApiInitialMessage = ({
  initialMessage,
}: {
  initialMessage: InitialMessage
}) => ({
  id: initialMessage.id,
  role: initialMessage.role,
  content: initialMessage.content,
  orderNumber: initialMessage.orderNumber,
  assistantId: initialMessage.assistantId,
  createdAt: initialMessage.createdAt.toISOString(),
  updatedAt: initialMessage.updatedAt.toISOString(),
})
