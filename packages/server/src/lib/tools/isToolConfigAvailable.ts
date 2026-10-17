import {
  ModelProviderType,
  StorageProviderType,
  ToolType,
} from '@prisma/client'

export type ToolConfigAvailability = {
  modelProviderType: ModelProviderType
  storageProviderType: StorageProviderType
}

export type ToolConfig = {
  type: ToolType
  availabilities: ToolConfigAvailability[]
}

export const toolConfigs: ToolConfig[] = [
  {
    type: ToolType.WEB_SEARCH,
    availabilities: [
      {
        modelProviderType: ModelProviderType.ANTHROPIC,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      },
      {
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.AZURE_OPENAI,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.AZURE_AI_PROJECT,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
    ],
  },
  {
    type: ToolType.FILE_SEARCH,
    availabilities: [
      {
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.AZURE_OPENAI,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI,
      },
      {
        modelProviderType: ModelProviderType.AZURE_OPENAI,
        storageProviderType: StorageProviderType.AZURE_OPENAI,
      },
      {
        modelProviderType: ModelProviderType.AZURE_AI_PROJECT,
        storageProviderType: StorageProviderType.AZURE_AGENTS,
      },
      {
        modelProviderType: ModelProviderType.AZURE_AI_PROJECT,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
    ],
  },
  {
    type: ToolType.IMAGE_GENERATION,
    availabilities: [
      {
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.AZURE_OPENAI,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
    ],
  },
  {
    type: ToolType.COMPUTER_USE,
    availabilities: [
      {
        modelProviderType: ModelProviderType.ANTHROPIC,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      },
      {
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.AZURE_OPENAI,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.OPEN_ROUTER,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      },
      {
        modelProviderType: ModelProviderType.GOOGLE,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      },
      {
        modelProviderType: ModelProviderType.OLLAMA,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      },
    ],
  },
  {
    type: ToolType.CODE_INTERPRETER,
    availabilities: [
      {
        modelProviderType: ModelProviderType.ANTHROPIC,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
      },
      {
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.AZURE_OPENAI,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
      {
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI,
      },
      {
        modelProviderType: ModelProviderType.AZURE_OPENAI,
        storageProviderType: StorageProviderType.AZURE_OPENAI,
      },
      {
        modelProviderType: ModelProviderType.AZURE_AI_PROJECT,
        storageProviderType: StorageProviderType.AZURE_AGENTS,
      },
      {
        modelProviderType: ModelProviderType.AZURE_AI_PROJECT,
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
      },
    ],
  },
]

export const isToolConfigAvailable = ({
  toolType,
  modelProviderType,
  storageProviderType,
}: {
  toolType: ToolType
  modelProviderType: ModelProviderType
  storageProviderType: StorageProviderType
}): boolean =>
  toolConfigs.some(
    (config) =>
      config.type === toolType &&
      config.availabilities.some(
        (availability) =>
          availability.modelProviderType === modelProviderType &&
          availability.storageProviderType === storageProviderType,
      ),
  )
