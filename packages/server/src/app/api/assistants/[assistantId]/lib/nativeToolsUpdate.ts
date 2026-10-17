import { ToolType, type Prisma } from '@prisma/client'

// Creates the native tools switched on and deletes the ones switched off,
// leaving tools whose flag is not provided untouched.
export const nativeToolsUpdate = ({
  assistantId,
  codeInterpreterEnabled,
  fileSearchEnabled,
}: {
  assistantId: string
  codeInterpreterEnabled: boolean | undefined
  fileSearchEnabled: boolean | undefined
}): Prisma.ToolUpdateManyWithoutAssistantNestedInput => ({
  create: [
    ...(codeInterpreterEnabled === true
      ? [
          {
            type: ToolType.CODE_INTERPRETER,
            codeInterpreterTool: { create: {} },
          },
        ]
      : []),
    ...(fileSearchEnabled === true
      ? [{ type: ToolType.FILE_SEARCH, fileSearchTool: { create: {} } }]
      : []),
  ],
  deleteMany: [
    ...(codeInterpreterEnabled === false
      ? [{ assistantId, type: ToolType.CODE_INTERPRETER }]
      : []),
    ...(fileSearchEnabled === false
      ? [{ assistantId, type: ToolType.FILE_SEARCH }]
      : []),
  ],
})
