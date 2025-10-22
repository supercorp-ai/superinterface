import assert from 'node:assert'
import { describe, it } from 'node:test'
import { randomUUID } from 'node:crypto'
import type OpenAI from 'openai'
import {
  HandlerType,
  ModelProviderType,
  StorageProviderType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { handleAssistant } from '@/lib/functions/handleFunction/handleAssistant'
import { storageThreadId } from '@/lib/threads/storageThreadId'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'

describe('handleAssistant nested assistants', () => {
  it('creates a child thread with correct storage metadata when parent uses OpenAI responses storage', async () => {
    const workspace = await createTestWorkspace()

    const parentModelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.OPENAI,
        apiKey: process.env.OPENAI_API_KEY ?? 'test-parent-api-key',
      },
    })

    const childModelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.OPENAI,
        apiKey: process.env.OPENAI_API_KEY ?? 'test-child-api-key',
      },
    })

    const parentAssistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: parentModelProvider.id,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        modelSlug: 'gpt-4o-mini',
      },
    })

    const childAssistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: childModelProvider.id,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelSlug: 'gpt-4o-mini',
      },
    })

    const fn = await prisma.function.create({
      data: {
        assistantId: parentAssistant.id,
        openapiSpec: {},
      },
    })

    const handler = await prisma.handler.create({
      data: {
        functionId: fn.id,
        type: HandlerType.ASSISTANT,
      },
    })

    const assistantHandler = await prisma.assistantHandler.create({
      data: {
        assistantId: childAssistant.id,
        handlerId: handler.id,
      },
    })

    const parentThread = await prisma.thread.create({
      data: {
        assistantId: parentAssistant.id,
        metadata: {
          assistantId: parentAssistant.id,
          threadId: `parent-thread-${randomUUID()}`,
          openaiConversationId: `conv-${randomUUID()}`,
        },
      },
    })

    const toolCall = {
      id: randomUUID(),
      type: 'function',
      function: {
        name: 'assistant.invoke',
        arguments: JSON.stringify({ message: 'Nested assistant call' }),
      },
    } as OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall

    const result = await handleAssistant({
      assistantHandler,
      toolCall,
      controller: {} as unknown as ReadableStreamDefaultController,
      run: { id: randomUUID() } as OpenAI.Beta.Threads.Runs.Run,
      assistant: parentAssistant,
      thread: parentThread,
      prisma,
    })

    assert.strictEqual(result.tool_call_id, toolCall.id)

    const childThread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: childAssistant.id },
      include: {
        assistant: {
          select: {
            storageProviderType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const metadata = childThread.metadata as Record<string, string>

    assert.strictEqual(childThread.assistantId, childAssistant.id)
    assert.strictEqual(metadata.assistantId, childAssistant.id)
    assert.strictEqual(metadata.threadId, childThread.id)
    assert.strictEqual(storageThreadId({ thread: childThread }), childThread.id)

    // Ensure parent metadata was not reused.
    assert.notStrictEqual(metadata.threadId, parentThread.metadata?.threadId)
    assert.notStrictEqual(
      metadata.assistantId,
      parentThread.metadata?.assistantId,
    )
  })
})
