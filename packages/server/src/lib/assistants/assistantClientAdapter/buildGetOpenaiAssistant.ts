import type { OpenAI } from 'openai'
import {
  Prisma,
  Thread,
  Assistant,
  TruncationType,
  PrismaClient,
  StorageProviderType,
} from '@prisma/client'
import dayjs from 'dayjs'
import { tools as getTools } from '@/lib/tools/tools'
import { storageAssistantId } from '@/lib/assistants/storageAssistantId'

type Args = {
  select?: {
    id?: boolean
  }
}

type NormalizedArgs = {
  select: {
    id: boolean
  }
}

const assistantReference = ({ assistant }: { assistant: Assistant }) => {
  const id = storageAssistantId({ assistant })
  const name =
    assistant.storageProviderType === StorageProviderType.AZURE_RESPONSES &&
    assistant.azureResponsesAgentName
      ? id
      : assistant.name

  return { id, name }
}

const truncationStrategy = ({
  assistant,
}: {
  assistant: Assistant
}): OpenAI.Beta.Threads.Runs.Run.TruncationStrategy => {
  if (assistant.truncationType === TruncationType.LAST_MESSAGES) {
    return {
      type: 'last_messages' as const,
      last_messages: assistant.truncationLastMessagesCount,
    }
  } else if (assistant.truncationType === TruncationType.DISABLED) {
    // @ts-expect-error - compat
    return {
      type: 'disabled' as const,
    } as OpenAI.Beta.Threads.Runs.Run.TruncationStrategy
  } else {
    return {
      type: 'auto' as const,
    }
  }
}

export const buildGetOpenaiAssistant =
  ({
    assistant,
    thread,
    prisma,
  }: {
    assistant: Prisma.AssistantGetPayload<{
      include: {
        tools: {
          include: {
            fileSearchTool: true
            webSearchTool: true
            imageGenerationTool: true
            codeInterpreterTool: true
            computerUseTool: true
          }
        }
        mcpServers: {
          include: {
            computerUseTool: true
            stdioTransport: true
            sseTransport: true
            httpTransport: true
          }
        }
        functions: true
        modelProvider: true
      }
    }>
    thread: Thread | null
    prisma: PrismaClient
  }) =>
  async ({ select: { id = false } = {} }: Args = {}) => {
    const args: NormalizedArgs = { select: { id } }
    const reference = assistantReference({ assistant })

    if (args.select.id) {
      return {
        id: reference.id,
      }
    }

    return {
      id: reference.id,
      object: 'assistant' as const,
      created_at: dayjs().unix(),
      model: assistant.modelSlug,
      name: reference.name,
      instructions: assistant.instructions,
      description: null,
      tools: thread
        ? ((await getTools({ assistant, thread, prisma }))?.tools ?? [])
        : [],
      metadata: {},
      top_p: 1.0,
      temperature: 1.0,
      response_format: { type: 'text' as const },
      truncation_strategy: truncationStrategy({ assistant }),
    }
  }
