import {
  ToolType,
  ComputerUseToolEnvironment,
  ImageGenerationToolBackground,
  ImageGenerationToolOutputFormat,
  ImageGenerationToolQuality,
  ImageGenerationToolSize,
} from '@prisma/client'
import { z } from 'zod'
import { addNestedSchemaIssues } from '@/lib/misc/addNestedSchemaIssues'

const fileSearchToolSchema = z.object({
  vectorStoreIds: z.array(z.string()),
  maxNumResults: z.number().int().positive(),
})

const imageGenerationToolSchema = z.object({
  model: z.string().optional(),
  quality: z.nativeEnum(ImageGenerationToolQuality).optional(),
  size: z.nativeEnum(ImageGenerationToolSize).optional(),
  outputFormat: z.nativeEnum(ImageGenerationToolOutputFormat).optional(),
  background: z.nativeEnum(ImageGenerationToolBackground).optional(),
  partialImages: z.number().int().min(0).optional(),
})

const computerUseToolSchema = z.object({
  displayWidth: z.number().int().min(640).max(4096),
  displayHeight: z.number().int().min(480).max(4096),
  environment: z.nativeEnum(ComputerUseToolEnvironment).optional(),
  mcpServerId: z.string().uuid().nullable().optional(),
})

// The settings field of each configurable tool type, with its schema.
const toolSettings = [
  {
    type: ToolType.FILE_SEARCH,
    key: 'fileSearchTool',
    schema: fileSearchToolSchema,
  },
  {
    type: ToolType.IMAGE_GENERATION,
    key: 'imageGenerationTool',
    schema: imageGenerationToolSchema,
  },
  {
    type: ToolType.COMPUTER_USE,
    key: 'computerUseTool',
    schema: computerUseToolSchema,
  },
] as const

const optionalToolSettingsShape = {
  fileSearchTool: fileSearchToolSchema.optional(),
  imageGenerationTool: imageGenerationToolSchema.optional(),
  computerUseTool: computerUseToolSchema.optional(),
}

// Re-validates every provided settings object whose tool type is included,
// so invalid settings are reported by the shape and again here.
const addToolSettingsIssues = ({
  values,
  ctx,
  includesType,
}: {
  values: Record<string, unknown>
  ctx: z.RefinementCtx
  includesType: (type: ToolType) => boolean
}) =>
  toolSettings
    .filter(({ type, key }) => includesType(type) && values[key])
    .forEach(({ key, schema }) =>
      addNestedSchemaIssues({
        ctx,
        schema,
        value: values[key],
        path: [key],
      }),
    )

export const toolSchema = z
  .object({
    type: z.nativeEnum(ToolType),
    ...optionalToolSettingsShape,
  })
  .superRefine((values, ctx) =>
    addToolSettingsIssues({
      values,
      ctx,
      includesType: (type) => type === values.type,
    }),
  )

export const updateToolSchema = z
  .object(optionalToolSettingsShape)
  .superRefine((values, ctx) =>
    addToolSettingsIssues({ values, ctx, includesType: () => true }),
  )
