import { MessageRole, InitialMessage, type PrismaClient } from '@prisma/client'

export const updateInitialMessages = async ({
  assistantId,
  initialMessages,
  prisma,
}: {
  assistantId: string
  initialMessages: { role: MessageRole; content: string }[]
  prisma: PrismaClient
}) => {
  const messages: InitialMessage[] = await prisma.$transaction(async (tx) => {
    await tx.initialMessage.deleteMany({
      where: { assistantId },
    })

    if (initialMessages.length === 0) {
      return [] as InitialMessage[]
    }

    const created = await tx.initialMessage.createManyAndReturn({
      data: initialMessages.map((m, index) => ({
        assistantId,
        role: m.role,
        content: m.content,
        orderNumber: index,
      })),
    })

    return created
  })

  return messages.sort((a, b) => a.orderNumber - b.orderNumber)
}
