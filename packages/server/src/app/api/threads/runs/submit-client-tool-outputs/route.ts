import { NextRequest, NextResponse } from 'next/server'
import { map } from 'p-iteration'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/prisma'
import { workspaceAccessWhere as getWorkspaceAccessWhere } from '@/lib/apiKeys/workspaceAccessWhere'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const { assistantId, publicApiKey, toolOutputs } = body

  const workspaceAccessWhere = await getWorkspaceAccessWhere({
    publicApiKey,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await map(toolOutputs, async (toolOutput: any) => {
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
  })

  return NextResponse.json({ status: 'success' })
}
