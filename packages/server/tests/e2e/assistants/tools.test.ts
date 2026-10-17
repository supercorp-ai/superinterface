import {
  testApiHandler,
  type NtarhInitAppRouter,
} from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  ComputerUseToolEnvironment,
  ModelProviderType,
  StorageProviderType,
  ToolType,
} from '@prisma/client'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'

const loadCollection = () =>
  import('../../../src/app/api/assistants/[assistantId]/tools/route')

const loadDetail = () =>
  import('../../../src/app/api/assistants/[assistantId]/tools/[toolId]/route')

type AppHandler = NtarhInitAppRouter['appHandler']

const call = async ({
  appHandler,
  params,
  method,
  headers,
  body,
}: {
  appHandler: AppHandler
  params: Record<string, string>
  method: string
  headers: Record<string, string>
  body?: unknown
}) => {
  let status = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = null
  await testApiHandler({
    appHandler,
    params,
    test: async ({ fetch }) => {
      const response = await fetch({
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      status = response.status
      json = await response.json()
    },
  })
  return { status, json }
}

const createOpenaiResponsesSetup = () =>
  createTestAssistantSetup({
    modelProviderType: ModelProviderType.OPENAI,
    storageProviderType: StorageProviderType.OPENAI_RESPONSES,
  })

describe('POST /api/assistants/[assistantId]/tools', () => {
  it('creates every tool type with default settings', async () => {
    const setup = await createOpenaiResponsesSetup()

    const expectations = [
      {
        type: ToolType.FILE_SEARCH,
        key: 'fileSearchTool',
        value: { vectorStoreIds: [], maxNumResults: 20 },
      },
      { type: ToolType.WEB_SEARCH, key: 'webSearchTool', value: {} },
      {
        type: ToolType.CODE_INTERPRETER,
        key: 'codeInterpreterTool',
        value: {},
      },
      {
        type: ToolType.IMAGE_GENERATION,
        key: 'imageGenerationTool',
        value: {
          model: 'gpt-image-1',
          quality: 'AUTO',
          size: 'AUTO',
          outputFormat: 'PNG',
          background: 'AUTO',
          partialImages: 0,
        },
      },
      {
        type: ToolType.COMPUTER_USE,
        key: 'computerUseTool',
        value: {
          displayWidth: 1280,
          displayHeight: 720,
          environment: ComputerUseToolEnvironment.LINUX,
          mcpServerId: null,
        },
      },
    ]

    for (const { type, key, value } of expectations) {
      const { status, json } = await call({
        appHandler: await loadCollection(),
        params: { assistantId: setup.assistant.id },
        method: 'POST',
        headers: setup.authHeaders,
        body: { type },
      })

      assert.strictEqual(status, 200, type)
      assert.strictEqual(json.tool.type, type)
      assert.deepStrictEqual(json.tool[key], value)
      const otherKeys = expectations
        .map((e) => e.key)
        .filter((otherKey) => otherKey !== key)
      for (const otherKey of otherKeys) {
        assert.strictEqual(json.tool[otherKey], undefined)
      }
    }

    const tools = await prisma.tool.findMany({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(tools.length, expectations.length)
  })

  it('ignores settings that belong to another tool type', async () => {
    const setup = await createOpenaiResponsesSetup()
    const { status, json } = await call({
      appHandler: await loadCollection(),
      params: { assistantId: setup.assistant.id },
      method: 'POST',
      headers: setup.authHeaders,
      body: {
        type: ToolType.WEB_SEARCH,
        fileSearchTool: { vectorStoreIds: ['vs_1'], maxNumResults: 3 },
        imageGenerationTool: { model: 'gpt-image-1' },
        computerUseTool: { displayWidth: 1024, displayHeight: 768 },
      },
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(Object.keys(json.tool).sort(), [
      'createdAt',
      'id',
      'type',
      'updatedAt',
      'webSearchTool',
    ])
    const fileSearchTools = await prisma.fileSearchTool.count({
      where: { tool: { assistantId: setup.assistant.id } },
    })
    assert.strictEqual(fileSearchTools, 0)
  })

  it('rejects out-of-range settings for each configurable tool type', async (t) => {
    const setup = await createOpenaiResponsesSetup()
    const consoleError = t.mock.method(console, 'error', () => {})
    const bodies = [
      {
        type: ToolType.FILE_SEARCH,
        fileSearchTool: { vectorStoreIds: [], maxNumResults: 0 },
      },
      {
        type: ToolType.IMAGE_GENERATION,
        imageGenerationTool: { partialImages: -1 },
      },
      {
        type: ToolType.COMPUTER_USE,
        computerUseTool: { displayWidth: 100, displayHeight: 100 },
      },
    ]

    for (const body of bodies) {
      const { status, json } = await call({
        appHandler: await loadCollection(),
        params: { assistantId: setup.assistant.id },
        method: 'POST',
        headers: setup.authHeaders,
        body,
      })
      assert.strictEqual(status, 400, body.type)
      assert.deepStrictEqual(json, { error: 'Invalid payload' })
    }

    // Each rejection is logged; out-of-range settings are reported by the
    // base schema and again by the tool-specific refinement.
    const logged = consoleError.mock.calls.map(
      ({ arguments: [label, error] }) => {
        assert.strictEqual(label, 'Tool creation error:')
        assert.ok(error instanceof ZodError)
        return error.issues.map(({ path, code }) => ({ path, code }))
      },
    )
    const tooSmall = (path: string[]) => ({ path, code: 'too_small' })
    assert.deepStrictEqual(logged, [
      [
        tooSmall(['fileSearchTool', 'maxNumResults']),
        tooSmall(['fileSearchTool', 'maxNumResults']),
      ],
      [
        tooSmall(['imageGenerationTool', 'partialImages']),
        tooSmall(['imageGenerationTool', 'partialImages']),
      ],
      [
        tooSmall(['computerUseTool', 'displayWidth']),
        tooSmall(['computerUseTool', 'displayHeight']),
        tooSmall(['computerUseTool', 'displayWidth']),
        tooSmall(['computerUseTool', 'displayHeight']),
      ],
    ])

    const count = await prisma.tool.count({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(count, 0)
  })

  it('rejects tool types unavailable for the provider configuration', async () => {
    const setup = await createTestAssistantSetup({
      modelProviderType: ModelProviderType.GROQ,
      storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
    })

    for (const type of Object.values(ToolType)) {
      const { status, json } = await call({
        appHandler: await loadCollection(),
        params: { assistantId: setup.assistant.id },
        method: 'POST',
        headers: setup.authHeaders,
        body: { type },
      })
      assert.strictEqual(status, 400, type)
      assert.strictEqual(
        json.error,
        `Tool type ${type} is not available for this assistant's provider configuration`,
      )
    }
  })
})

describe('/api/assistants/[assistantId]/tools/[toolId]', () => {
  const createTool = async ({
    setup,
    body,
  }: {
    setup: Awaited<ReturnType<typeof createOpenaiResponsesSetup>>
    body: unknown
  }) => {
    const { json } = await call({
      appHandler: await loadCollection(),
      params: { assistantId: setup.assistant.id },
      method: 'POST',
      headers: setup.authHeaders,
      body,
    })
    return json.tool as { id: string }
  }

  const patch = async ({
    setup,
    toolId,
    body,
  }: {
    setup: Awaited<ReturnType<typeof createOpenaiResponsesSetup>>
    toolId: string
    body: unknown
  }) =>
    call({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id, toolId },
      method: 'PATCH',
      headers: setup.authHeaders,
      body,
    })

  it('returns 400 for unknown tools of an owned assistant', async () => {
    const setup = await createOpenaiResponsesSetup()

    for (const method of ['GET', 'PATCH', 'DELETE']) {
      const { status, json } = await call({
        appHandler: await loadDetail(),
        params: { assistantId: setup.assistant.id, toolId: randomUUID() },
        method,
        headers: setup.authHeaders,
        ...(method === 'PATCH' ? { body: {} } : {}),
      })
      assert.strictEqual(status, 400, method)
      assert.deepStrictEqual(json, { error: 'No tool found' })
    }
  })

  it('updates computer use settings', async () => {
    const setup = await createOpenaiResponsesSetup()
    const tool = await createTool({
      setup,
      body: { type: ToolType.COMPUTER_USE },
    })

    const { status, json } = await patch({
      setup,
      toolId: tool.id,
      body: {
        computerUseTool: {
          displayWidth: 1920,
          displayHeight: 1080,
          environment: ComputerUseToolEnvironment.MACOS,
        },
      },
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(json.tool.computerUseTool, {
      displayWidth: 1920,
      displayHeight: 1080,
      environment: ComputerUseToolEnvironment.MACOS,
      mcpServerId: null,
    })
    const stored = await prisma.computerUseTool.findUniqueOrThrow({
      where: { toolId: tool.id },
    })
    assert.strictEqual(stored.displayWidth, 1920)
  })

  it('leaves tools unchanged when no settings for their type are sent', async () => {
    const setup = await createOpenaiResponsesSetup()
    const fileSearch = await createTool({
      setup,
      body: {
        type: ToolType.FILE_SEARCH,
        fileSearchTool: { vectorStoreIds: ['vs_keep'], maxNumResults: 4 },
      },
    })
    const imageGeneration = await createTool({
      setup,
      body: {
        type: ToolType.IMAGE_GENERATION,
        imageGenerationTool: { model: 'gpt-image-1-mini' },
      },
    })
    const computerUse = await createTool({
      setup,
      body: {
        type: ToolType.COMPUTER_USE,
        computerUseTool: { displayWidth: 800, displayHeight: 600 },
      },
    })
    const webSearch = await createTool({
      setup,
      body: { type: ToolType.WEB_SEARCH },
    })

    const fileSearchResult = await patch({
      setup,
      toolId: fileSearch.id,
      body: { imageGenerationTool: { model: 'other' } },
    })
    assert.strictEqual(fileSearchResult.status, 200)
    assert.deepStrictEqual(fileSearchResult.json.tool.fileSearchTool, {
      vectorStoreIds: ['vs_keep'],
      maxNumResults: 4,
    })
    assert.strictEqual(
      fileSearchResult.json.tool.imageGenerationTool,
      undefined,
    )

    const imageResult = await patch({
      setup,
      toolId: imageGeneration.id,
      body: { computerUseTool: { displayWidth: 1024, displayHeight: 768 } },
    })
    assert.strictEqual(imageResult.status, 200)
    assert.strictEqual(
      imageResult.json.tool.imageGenerationTool.model,
      'gpt-image-1-mini',
    )
    assert.strictEqual(imageResult.json.tool.computerUseTool, undefined)

    const computerResult = await patch({
      setup,
      toolId: computerUse.id,
      body: {},
    })
    assert.strictEqual(computerResult.status, 200)
    assert.strictEqual(
      computerResult.json.tool.computerUseTool.displayWidth,
      800,
    )

    const webResult = await patch({
      setup,
      toolId: webSearch.id,
      body: { fileSearchTool: { vectorStoreIds: [], maxNumResults: 1 } },
    })
    assert.strictEqual(webResult.status, 200)
    assert.deepStrictEqual(webResult.json.tool.webSearchTool, {})
    assert.strictEqual(webResult.json.tool.fileSearchTool, undefined)
  })

  it('rejects out-of-range settings on PATCH', async () => {
    const setup = await createOpenaiResponsesSetup()
    const tool = await createTool({
      setup,
      body: { type: ToolType.COMPUTER_USE },
    })

    for (const body of [
      { fileSearchTool: { vectorStoreIds: [], maxNumResults: -5 } },
      { imageGenerationTool: { partialImages: -1 } },
      { computerUseTool: { displayWidth: 5000, displayHeight: 720 } },
      { computerUseTool: { displayWidth: 'wide', displayHeight: 720 } },
    ]) {
      const { status, json } = await patch({ setup, toolId: tool.id, body })
      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'Invalid payload' })
    }

    const stored = await prisma.computerUseTool.findUniqueOrThrow({
      where: { toolId: tool.id },
    })
    assert.strictEqual(stored.displayWidth, 1280)
  })

  it('deletes a tool with its settings', async () => {
    const setup = await createOpenaiResponsesSetup()
    const tool = await createTool({
      setup,
      body: { type: ToolType.COMPUTER_USE },
    })

    const { status, json } = await call({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id, toolId: tool.id },
      method: 'DELETE',
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.tool.id, tool.id)
    assert.strictEqual(json.tool.computerUseTool.displayWidth, 1280)
    const [storedTool, storedSettings] = await Promise.all([
      prisma.tool.findUnique({ where: { id: tool.id } }),
      prisma.computerUseTool.findUnique({ where: { toolId: tool.id } }),
    ])
    assert.strictEqual(storedTool, null)
    assert.strictEqual(storedSettings, null)
  })
})
