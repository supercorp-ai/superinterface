import type { Prisma, Thread, PrismaClient } from '@prisma/client'
import type OpenAI from 'openai'
import { modelProviderConfigs } from '@/lib/modelProviders/modelProviderConfigs'
import { isOpenaiResponsesComputerUseModel } from '@/lib/tools/isOpenaiResponsesComputerUseModel'
import { nativeToolSerializers } from '@/lib/tools/native/nativeToolSerializers'
import { mcpServerTools } from '@/lib/tools/tools/mcpServerTools'
import { assistantFunctionTools } from '@/lib/tools/tools/assistantFunctionTools'

type NativeToolsAssistant = Prisma.AssistantGetPayload<{
  include: {
    modelProvider: true
    tools: {
      include: {
        fileSearchTool: true
        webSearchTool: true
        imageGenerationTool: true
        codeInterpreterTool: true
        computerUseTool: true
      }
    }
  }
}>

type ToolsAssistant = NativeToolsAssistant &
  Prisma.AssistantGetPayload<{
    include: {
      functions: true
      mcpServers: {
        include: {
          computerUseTool: true
          stdioTransport: true
          httpTransport: true
          sseTransport: true
        }
      }
    }
  }>

export const nativeTools = ({
  assistant,
  useOpenaiComputerTool,
}: {
  assistant: NativeToolsAssistant
  useOpenaiComputerTool: boolean
}): OpenAI.Beta.Assistants.AssistantTool[] =>
  assistant.tools.flatMap((tool) =>
    nativeToolSerializers[tool.type]({
      tool,
      storageProviderType: assistant.storageProviderType,
      modelProviderType: assistant.modelProvider.type,
      useOpenaiComputerTool,
    }),
  ) as OpenAI.Beta.Assistants.AssistantTool[]

export const tools = async ({
  assistant,
  thread,
  prisma,
}: {
  assistant: ToolsAssistant
  thread: Thread
  prisma: PrismaClient
}) => {
  // Every ModelProviderType has a config.
  const modelProviderConfig = modelProviderConfigs.find(
    (config) => config.type === assistant.modelProvider.type,
  )!

  if (!modelProviderConfig.isFunctionCallingAvailable) {
    return {}
  }

  const useOpenaiComputerTool = isOpenaiResponsesComputerUseModel({ assistant })

  return {
    tools: [
      ...(await mcpServerTools({
        assistant,
        thread,
        prisma,
        useOpenaiComputerTool,
      })),
      ...assistantFunctionTools({ functions: assistant.functions }),
      ...nativeTools({ assistant, useOpenaiComputerTool }),
    ] as OpenAI.Beta.Assistants.AssistantTool[],
  }
}
