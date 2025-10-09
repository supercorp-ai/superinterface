import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { type PrismaClient } from '@prisma/client'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'

export const buildPOST =
  ({ prisma }: { prisma: PrismaClient }) =>
  async (request: NextRequest) => {
    const body = await request.json()

    const { assistantId, publicApiKey, toolOutputs } = body

    const workspaceAccessWhere = await getWorkspaceAccessWhere({
      publicApiKey,
      prisma,
    })

    if (!workspaceAccessWhere) {
      return NextResponse.json({ error: 'Invalid api key' }, { status: 400 })
    }

    if (!assistantId) {
      return NextResponse.json(
        { error: 'No assistant id found' },
        { status: 400 },
      )
    }

    const assistant = await prisma.assistant.findFirst({
      where: {
        id: assistantId,
        workspace: workspaceAccessWhere,
      },
    })

    if (!assistant) {
      return NextResponse.json({ error: 'No assistant found' }, { status: 400 })
    }

    if (!Array.isArray(toolOutputs)) {
      return NextResponse.json(
        { error: 'Invalid tool outputs' },
        { status: 400 },
      )
    }

    await Promise.all(
      toolOutputs.map(
        async (toolOutput: { toolCallId: string; output: unknown }) => {
          const isPending = await redis.get(
            `submit-client-tool-outputs:pending:${toolOutput.toolCallId}`,
          )

          if (isPending) {
            await redis.set(
              `submit-client-tool-outputs:output:${toolOutput.toolCallId}`,
              JSON.stringify(toolOutput.output),
              { ex: 60 * 60 * 24 * 7 },
            )
          }
        },
      ),
    )

    return NextResponse.json({ status: 'success' })
  }
