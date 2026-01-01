import OpenAI from 'openai'
import { StorageProviderType } from '@prisma/client'
import { PrismaClient, Prisma } from '@prisma/client'
import { isOpenaiAssistantsStorageProvider } from '@/lib/storageProviders/isOpenaiAssistantsStorageProvider'
import { isAzureAgentsStorageProvider } from '@/lib/storageProviders/isAzureAgentsStorageProvider'
import { initialMessages } from './initialMessages'
import { serializeMetadata } from '@/lib/metadata/serializeMetadata'

export const createThread = async ({
  client,
  assistant,
  prisma,
  variables = {},
}: {
  client: OpenAI
  assistant: Prisma.AssistantGetPayload<{
    include: {
      initialMessages: true
      modelProvider: true
    }
  }>
  prisma: PrismaClient
  variables?: Record<string, string>
}) => {
  const serializedMetadata = serializeMetadata({
    variables,
    workspaceId: assistant.workspaceId,
    prisma,
  })

  let thread

  if (
    isOpenaiAssistantsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    const newThread = await prisma.thread.create({
      data: {
        assistantId: assistant.id,
        metadata: serializedMetadata,
      },
    })

    const storageProviderThread = await client.beta.threads.create({
      messages: initialMessages({ assistant }),
      metadata: {
        assistantId: assistant.id,
        threadId: newThread.id,
        ...serializedMetadata,
      },
    })

    thread = await prisma.thread.update({
      where: {
        id: newThread.id,
      },
      include: {
        assistant: {
          select: {
            storageProviderType: true,
          },
        },
      },
      data: {
        openaiThreadId: storageProviderThread.id,
        metadata: {
          assistantId: assistant.id,
          threadId: newThread.id,
          ...serializedMetadata,
        },
      },
    })
  } else if (
    assistant.storageProviderType === StorageProviderType.OPENAI_RESPONSES
  ) {
    const newThread = await prisma.thread.create({
      data: {
        assistantId: assistant.id,
        metadata: serializedMetadata,
      },
    })

    const storageProviderThread = await client.beta.threads.create({
      messages: initialMessages({ assistant }),
      metadata: {
        assistantId: assistant.id,
        threadId: newThread.id,
        ...serializedMetadata,
      },
    })

    thread = await prisma.thread.update({
      where: {
        id: newThread.id,
      },
      include: {
        assistant: {
          select: {
            storageProviderType: true,
          },
        },
      },
      data: {
        openaiConversationId: storageProviderThread.id,
        metadata: {
          assistantId: assistant.id,
          threadId: newThread.id,
          ...serializedMetadata,
        },
      },
    })
  } else if (
    assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES
  ) {
    const newThread = await prisma.thread.create({
      data: {
        assistantId: assistant.id,
        metadata: serializedMetadata,
      },
    })

    const storageProviderThread = await client.beta.threads.create({
      messages: initialMessages({ assistant }),
      metadata: {
        assistantId: assistant.id,
        threadId: newThread.id,
        ...serializedMetadata,
      },
    })

    thread = await prisma.thread.update({
      where: {
        id: newThread.id,
      },
      include: {
        assistant: {
          select: {
            storageProviderType: true,
          },
        },
      },
      data: {
        azureOpenaiConversationId: storageProviderThread.id,
        metadata: {
          assistantId: assistant.id,
          threadId: newThread.id,
          ...serializedMetadata,
        },
      },
    })
  } else if (
    isAzureAgentsStorageProvider({
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    const newThread = await prisma.thread.create({
      data: {
        assistantId: assistant.id,
        metadata: serializedMetadata,
      },
    })

    const storageProviderThread = await client.beta.threads.create({
      messages: initialMessages({ assistant }),
      metadata: {
        assistantId: assistant.id,
        threadId: newThread.id,
        ...serializedMetadata,
      },
    })

    thread = await prisma.thread.update({
      where: {
        id: newThread.id,
      },
      include: {
        assistant: {
          select: {
            storageProviderType: true,
          },
        },
      },
      data: {
        azureAgentsThreadId: storageProviderThread.id,
        metadata: {
          assistantId: assistant.id,
          threadId: newThread.id,
          ...serializedMetadata,
        },
      },
    })
  } else {
    const storageProviderThread = await client.beta.threads.create({
      messages: initialMessages({ assistant }),
      metadata: {
        assistantId: assistant.id,
        ...serializedMetadata,
      },
    })

    thread = await prisma.thread.update({
      where: {
        id: storageProviderThread.id,
      },
      include: {
        assistant: {
          select: {
            storageProviderType: true,
          },
        },
      },
      data: {
        metadata: {
          assistantId: assistant.id,
          threadId: storageProviderThread.id,
          ...serializedMetadata,
        },
      },
    })
  }

  if (!thread) {
    throw new Error('Failed to create thread')
  }

  return thread
}
