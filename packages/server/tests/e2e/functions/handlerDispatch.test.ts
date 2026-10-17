import assert from 'node:assert'
import { describe, it } from 'node:test'
import { HandlerType, MethodType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestFunction } from '../../lib/functions/createTestFunction'
import { runFakeToolCalls } from '../../lib/functions/runFakeToolCalls'
import { startTestHttpServer } from '../../lib/http/startTestHttpServer'
import { assertAssistantLog } from '../../lib/logs/assertAssistantLog'

const spec = ({ name }: { name: string }) => ({
  name,
  description: `The ${name} function`,
  parameters: { type: 'object', properties: {} },
})

describe('function handler dispatch', () => {
  it('reports functions whose handler or handler config is missing', async () => {
    const handlerTypes = [
      HandlerType.REQUEST,
      HandlerType.CLIENT_TOOL,
      HandlerType.FIRECRAWL,
      HandlerType.REPLICATE,
      HandlerType.ASSISTANT,
      HandlerType.CREATE_TASK,
      HandlerType.LIST_TASKS,
      HandlerType.UPDATE_TASK,
      HandlerType.DELETE_TASK,
    ]
    const names = handlerTypes.map((type) => `fn_${type.toLowerCase()}`)

    const result = await runFakeToolCalls({
      toolCalls: [
        { name: 'no_handler', arguments: {} },
        ...names.map((name) => ({ name, arguments: {} })),
      ],
      setup: async ({ assistant }) => {
        await createTestFunction({
          assistantId: assistant.id,
          openapiSpec: spec({ name: 'no_handler' }),
        })

        for (const [index, type] of handlerTypes.entries()) {
          await createTestFunction({
            assistantId: assistant.id,
            openapiSpec: spec({ name: names[index] }),
            handler: { type },
          })
        }
      },
    })

    assert.strictEqual(result.status, 200)
    const expectedOutputs = [
      'Function fn_assistant has no assistant handler.',
      'Function fn_client_tool has no client tool handler.',
      'Function fn_create_task has no task handler.',
      'Function fn_delete_task has no task handler.',
      'Function fn_firecrawl has no Firecrawl handler.',
      'Function fn_list_tasks has no task handler.',
      'Function fn_replicate has no Replicate handler.',
      'Function fn_request has no request handler.',
      'Function fn_update_task has no task handler.',
      'Function no_handler has no handler.',
    ]
    assert.deepStrictEqual(result.toolOutputs.sort(), expectedOutputs)

    // Every missing handler is also logged against the run's thread.
    const thread = await prisma.thread.findFirstOrThrow({
      where: { assistantId: result.assistant.id },
    })
    for (const message of expectedOutputs) {
      await assertAssistantLog({
        assistantId: result.assistant.id,
        workspaceId: result.assistant.workspaceId,
        threadId: thread.id,
        status: 500,
        message,
      })
    }
    const logs = await prisma.log.findMany({
      where: { assistantId: result.assistant.id },
    })
    assert.deepStrictEqual(
      logs.map(({ message }) => message).sort(),
      expectedOutputs,
    )
  })

  it('dispatches task functions to their task handlers', async () => {
    const taskTypes = [
      HandlerType.CREATE_TASK,
      HandlerType.LIST_TASKS,
      HandlerType.UPDATE_TASK,
      HandlerType.DELETE_TASK,
    ]
    const names = taskTypes.map((type) => `task_${type.toLowerCase()}`)

    const result = await runFakeToolCalls({
      // Invalid arguments make each task handler answer without side effects.
      toolCalls: names.map((name) => ({ name, arguments: '{invalid' })),
      setup: async ({ assistant }) => {
        for (const [index, type] of taskTypes.entries()) {
          const relation = {
            [HandlerType.CREATE_TASK]: 'createTaskHandler',
            [HandlerType.LIST_TASKS]: 'listTasksHandler',
            [HandlerType.UPDATE_TASK]: 'updateTaskHandler',
            [HandlerType.DELETE_TASK]: 'deleteTaskHandler',
          }[type as string]!

          await createTestFunction({
            assistantId: assistant.id,
            openapiSpec: spec({ name: names[index] }),
            handler: { type, [relation]: { create: {} } },
          })
        }
      },
    })

    assert.strictEqual(result.toolOutputs.length, 4)
    for (const output of result.toolOutputs) {
      assert.match(output, /Invalid arguments|JSON|Unexpected|Expected/i)
      assert.doesNotMatch(output, /has no task handler/)
    }
  })

  it('ignores functions with an invalid openapi spec when resolving calls', async () => {
    const api = await startTestHttpServer({
      handle: ({ res }) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      },
    })

    try {
      const result = await runFakeToolCalls({
        toolCalls: [
          { name: 'valid_fn', arguments: {} },
          { name: 'nameless', arguments: {} },
        ],
        setup: async ({ assistant }) => {
          const request = {
            type: HandlerType.REQUEST,
            requestHandler: {
              create: {
                url: api.url,
                method: MethodType.POST,
                headers: {},
                body: {},
              },
            },
          }
          await createTestFunction({
            assistantId: assistant.id,
            openapiSpec: {},
            handler: request,
          })
          const nullSpec = await createTestFunction({
            assistantId: assistant.id,
            openapiSpec: {},
            handler: request,
          })
          // A JSON `null` spec cannot be written through Prisma's input types.
          await prisma.$executeRaw`UPDATE "Function" SET "openapiSpec" = 'null'::jsonb WHERE id = ${nullSpec.id}::uuid`
          await createTestFunction({
            assistantId: assistant.id,
            openapiSpec: ['not', 'an', 'object'],
            handler: request,
          })
          await createTestFunction({
            assistantId: assistant.id,
            openapiSpec: { description: 'nameless' },
            handler: request,
          })
          await createTestFunction({
            assistantId: assistant.id,
            openapiSpec: spec({ name: 'valid_fn' }),
            handler: request,
          })
        },
      })

      assert.deepStrictEqual(result.toolOutputs.sort(), [
        'Function nameless not found.',
        JSON.stringify({ ok: true }),
      ])
      assert.strictEqual(api.requests.length, 1)
    } finally {
      await api.close()
    }
  })
})
