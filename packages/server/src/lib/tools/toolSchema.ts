import {
  ToolType,
  ComputerUseToolEnvironment,
  ImageGenerationToolBackground,
  ImageGenerationToolOutputFormat,
  ImageGenerationToolQuality,
  ImageGenerationToolSize,
} from '@prisma/client'
import { z } from 'zod'

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

const baseToolSchema = z.object({
  type: z.nativeEnum(ToolType),
  fileSearchTool: fileSearchToolSchema.optional(),
  imageGenerationTool: imageGenerationToolSchema.optional(),
  computerUseTool: computerUseToolSchema.optional(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const superRefine = (values: any, ctx: any) => {
  if (values.type === ToolType.FILE_SEARCH && values.fileSearchTool) {
    const result = fileSearchToolSchema.safeParse(values.fileSearchTool)
    if (!result.success) {
      result.error.issues.forEach((issue: z.ZodIssue) =>
        ctx.addIssue({
          ...issue,
          path: ['fileSearchTool', ...issue.path],
        }),
      )
    }
  }

  if (values.type === ToolType.IMAGE_GENERATION && values.imageGenerationTool) {
    const result = imageGenerationToolSchema.safeParse(
      values.imageGenerationTool,
    )
    if (!result.success) {
      result.error.issues.forEach((issue: z.ZodIssue) =>
        ctx.addIssue({
          ...issue,
          path: ['imageGenerationTool', ...issue.path],
        }),
      )
    }
  }

  if (values.type === ToolType.COMPUTER_USE && values.computerUseTool) {
    const result = computerUseToolSchema.safeParse(values.computerUseTool)
    if (!result.success) {
      result.error.issues.forEach((issue: z.ZodIssue) =>
        ctx.addIssue({
          ...issue,
          path: ['computerUseTool', ...issue.path],
        }),
      )
    }
  }
}

export const toolSchema = baseToolSchema.superRefine(superRefine)

export const updateToolSchema = z
  .object({
    fileSearchTool: fileSearchToolSchema.optional(),
    imageGenerationTool: imageGenerationToolSchema.optional(),
    computerUseTool: computerUseToolSchema.optional(),
  })
  .superRefine((values, ctx) => {
    if (values.fileSearchTool) {
      const result = fileSearchToolSchema.safeParse(values.fileSearchTool)
      if (!result.success) {
        result.error.issues.forEach((issue) =>
          ctx.addIssue({
            ...issue,
            path: ['fileSearchTool', ...issue.path],
          }),
        )
      }
    }

    if (values.imageGenerationTool) {
      const result = imageGenerationToolSchema.safeParse(
        values.imageGenerationTool,
      )
      if (!result.success) {
        result.error.issues.forEach((issue) =>
          ctx.addIssue({
            ...issue,
            path: ['imageGenerationTool', ...issue.path],
          }),
        )
      }
    }

    if (values.computerUseTool) {
      const result = computerUseToolSchema.safeParse(values.computerUseTool)
      if (!result.success) {
        result.error.issues.forEach((issue) =>
          ctx.addIssue({
            ...issue,
            path: ['computerUseTool', ...issue.path],
          }),
        )
      }
    }
  })
