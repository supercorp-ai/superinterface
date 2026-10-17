import { PrismaClient } from '@prisma/client'
import { testServer } from './testServer'

// Adds a file citation for `marker` to the stored message whose text is
// `text`. Assistants on an Ollama model provider never produce annotations
// (only OpenAI Responses and Azure Agents storage do), so this is the one
// step that writes to the test server's database directly.
export const annotateMessage = async ({
  text,
  marker,
}: {
  text: string
  marker: string
}) => {
  const prisma = new PrismaClient({
    datasources: { db: { url: testServer().databaseUrl } },
  })

  // The reply streams into the page before the run stores it as completed;
  // annotating earlier would be overwritten.
  const completedMessage = async () => {
    const deadline = Date.now() + 15_000

    while (Date.now() < deadline) {
      const messages = await prisma.message.findMany({
        where: { role: 'ASSISTANT', status: 'COMPLETED' },
      })
      const message = messages.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (candidate) => (candidate.content as any)[0]?.text?.value === text,
      )
      if (message) return message

      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    throw new Error(`No completed message with text: ${text}`)
  }

  try {
    const message = await completedMessage()

    const startIndex = text.indexOf(marker)

    await prisma.message.update({
      where: { id: message.id },
      data: {
        content: [
          {
            type: 'text',
            text: {
              value: text,
              annotations: [
                {
                  type: 'file_citation',
                  text: marker,
                  start_index: startIndex,
                  end_index: startIndex + marker.length,
                  file_citation: { file_id: 'file-e2e-citation' },
                },
              ],
            },
          },
        ],
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}
