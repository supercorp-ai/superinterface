import { NextResponse } from 'next/server'
import type { Assistant, ModelProvider, PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { toolInclude } from '@/lib/tools/serializeApiTool'
import type { toolSchema } from '@/lib/tools/toolSchema'
import { isToolConfigAvailable } from '@/lib/tools/isToolConfigAvailable'
import { toolCreateData } from '@/lib/tools/toolCreateData'
import { toolResponse } from '@/lib/tools/toolResponse'

// Creates the tool when its type is available for the assistant's model and
// storage providers.
export const createToolResponse = async ({
  prisma,
  assistant,
  body,
}: {
  prisma: PrismaClient
  assistant: Assistant & { modelProvider: ModelProvider }
  body: z.infer<typeof toolSchema>
}) => {
  const { type } = body

  if (
    !isToolConfigAvailable({
      toolType: type,
      modelProviderType: assistant.modelProvider.type,
      storageProviderType: assistant.storageProviderType,
    })
  ) {
    return NextResponse.json(
      {
        error: `Tool type ${type} is not available for this assistant's provider configuration`,
      },
      { status: 400 },
    )
  }

  const tool = await prisma.tool.create({
    data: {
      type,
      assistantId: assistant.id,
      ...toolCreateData({ body }),
    },
    include: toolInclude,
  })

  return toolResponse({ tool })
}
