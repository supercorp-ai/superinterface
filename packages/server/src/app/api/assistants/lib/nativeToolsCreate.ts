import { ToolType, type Prisma } from '@prisma/client'

// Creates the native tools that are switched on, file search first.
export const nativeToolsCreate = ({
  codeInterpreterEnabled,
  fileSearchEnabled,
}: {
  codeInterpreterEnabled: boolean
  fileSearchEnabled: boolean
}): Prisma.ToolCreateNestedManyWithoutAssistantInput => ({
  create: [
    ...(fileSearchEnabled
      ? [{ type: ToolType.FILE_SEARCH, fileSearchTool: { create: {} } }]
      : []),
    ...(codeInterpreterEnabled
      ? [
          {
            type: ToolType.CODE_INTERPRETER,
            codeInterpreterTool: { create: {} },
          },
        ]
      : []),
  ],
})
