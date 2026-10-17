import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { describe, it } from 'node:test'
import {
  ComputerUseToolEnvironment,
  ModelProviderType,
  Prisma,
  StorageProviderType,
  ToolType,
  TransportType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'
import {
  startFakeHttpServer,
  type FakeHttpRequest,
  type FakeHttpReply,
} from '../../lib/http/startFakeHttpServer'
import { readMessageEvents } from '../../lib/messages/readMessageEvents'

// These tests post a user message through /api/messages and inspect what the
// server sends to a local stand-in for the provider API. They check that the
// assistant configuration (storage ids, model, computer use tool) is turned
// into the right provider request.

const providerError = { status: 400, json: { error: { message: 'stop' } } }

const assistantsApi = ({ request }: { request: FakeHttpRequest }) => {
  if (request.path === '/v1/threads') {
    return {
      json: {
        id: 'thread_fake',
        object: 'thread',
        created_at: 0,
        metadata: {},
      },
    }
  }

  if (request.path === '/v1/threads/thread_fake/messages') {
    return {
      json: {
        id: 'msg_fake',
        object: 'thread.message',
        created_at: 0,
        thread_id: 'thread_fake',
        role: 'user',
        content: [],
        metadata: {},
      },
    }
  }

  return providerError
}

const conversationItems = {
  json: {
    object: 'list',
    data: [
      {
        id: 'msg_fake',
        type: 'message',
        role: 'user',
        status: 'completed',
        content: [{ type: 'input_text', text: 'Hi' }],
      },
    ],
    first_id: 'msg_fake',
    last_id: 'msg_fake',
    has_more: false,
  },
}

const responsesApi = ({
  request,
}: {
  request: FakeHttpRequest
}): FakeHttpReply => {
  if (request.path.endsWith('/conversations')) {
    return {
      json: {
        id: 'conv_fake',
        object: 'conversation',
        created_at: 0,
        metadata: {},
      },
    }
  }

  if (request.path.endsWith('/conversations/conv_fake/items')) {
    return conversationItems
  }

  return providerError
}

const postMessage = async ({
  assistantId,
  publicApiKey,
}: {
  assistantId: string
  publicApiKey: string
}) => {
  let status = 0
  let events: Awaited<ReturnType<typeof readMessageEvents>> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = null

  await testApiHandler({
    appHandler: await import('../../../src/app/api/messages/route'),
    test: async ({ fetch }) => {
      const response = await fetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, publicApiKey, content: 'Hi' }),
      })
      status = response.status
      if (status !== 200) {
        json = await response.json()
        return
      }
      events = await readMessageEvents({ response })
    },
  })

  return { status, events, json }
}

const runRequest = ({
  requests,
  path,
}: {
  requests: FakeHttpRequest[]
  path: string
}) => {
  const request = requests.find((r) => r.method === 'POST' && r.path === path)
  assert.ok(request, `expected a POST ${path}`)
  return request.body
}

const addComputerUseTool = async ({
  assistantId,
  environment,
}: {
  assistantId: string
  environment: ComputerUseToolEnvironment
}) => {
  const mcpServer = await prisma.mcpServer.create({
    data: {
      assistantId,
      name: 'desktop',
      transportType: TransportType.HTTP,
      // Never contacted: computer use MCP servers are only called when the
      // model requests a computer action.
      httpTransport: { create: { url: 'http://127.0.0.1:9/mcp', headers: {} } },
    },
  })
  await prisma.tool.create({
    data: {
      assistantId,
      type: ToolType.COMPUTER_USE,
      computerUseTool: {
        create: {
          environment,
          displayWidth: 1440,
          displayHeight: 900,
          mcpServerId: mcpServer.id,
        },
      },
    },
  })
}

const withOpenaiPlatform = async ({
  respond,
  modelProviderType,
  storageProviderType,
  assistantData,
}: {
  respond: (args: { request: FakeHttpRequest }) => FakeHttpReply
  modelProviderType: ModelProviderType
  storageProviderType: StorageProviderType
  assistantData: Partial<Prisma.AssistantUncheckedCreateInput>
}) => {
  const fake = await startFakeHttpServer({ respond })

  // The OpenAI SDK falls back to OPENAI_BASE_URL; Azure clients use the
  // provider endpoint and refuse to start when OPENAI_BASE_URL is set.
  if (modelProviderType === ModelProviderType.OPENAI) {
    process.env.OPENAI_BASE_URL = `${fake.origin}/v1`
  } else {
    delete process.env.OPENAI_BASE_URL
  }

  const setup = await createTestAssistantSetup({
    modelProviderType,
    storageProviderType,
    assistantData,
  })
  await prisma.modelProvider.update({
    where: { id: setup.modelProvider.id },
    data: { endpoint: fake.origin },
  })

  return { fake, setup }
}

describe('provider requests built from assistant configuration', () => {
  it('runs OpenAI Assistants storage with the stored OpenAI assistant id', async () => {
    const { fake, setup } = await withOpenaiPlatform({
      respond: assistantsApi,
      modelProviderType: ModelProviderType.OPENAI,
      storageProviderType: StorageProviderType.OPENAI,
      assistantData: {
        openaiAssistantId: 'asst_configured',
        modelSlug: 'gpt-4o',
      },
    })

    try {
      const { status, json } = await postMessage({
        assistantId: setup.assistant.id,
        publicApiKey: setup.publicKey.value,
      })

      assert.strictEqual(status, 500)
      assert.deepStrictEqual(json, { error: 'Failed to create run stream.' })
      const body = runRequest({
        requests: fake.requests,
        path: '/v1/threads/thread_fake/runs',
      })
      assert.strictEqual(body.assistant_id, 'asst_configured')
      assert.strictEqual(body.model, 'gpt-4o')
    } finally {
      await fake.close()
    }
  })

  for (const modelSlug of ['gpt-5.4', ' GPT-5.4-mini ']) {
    it(`sends the native computer tool for "${modelSlug}" on OpenAI Responses`, async () => {
      const { fake, setup } = await withOpenaiPlatform({
        respond: responsesApi,
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        assistantData: { modelSlug },
      })
      await addComputerUseTool({
        assistantId: setup.assistant.id,
        environment: ComputerUseToolEnvironment.LINUX,
      })

      try {
        const { status, events } = await postMessage({
          assistantId: setup.assistant.id,
          publicApiKey: setup.publicKey.value,
        })

        assert.strictEqual(status, 200)
        assert.ok(events.some(({ event }) => event === 'thread.run.failed'))
        const body = runRequest({
          requests: fake.requests,
          path: '/v1/responses',
        })
        assert.strictEqual(body.model, modelSlug)
        assert.deepStrictEqual(body.tools, [{ type: 'computer' }])
      } finally {
        await fake.close()
      }
    })
  }

  for (const [environment, expected] of [
    [ComputerUseToolEnvironment.MACOS, 'mac'],
    [ComputerUseToolEnvironment.BROWSER, 'browser'],
  ] as const) {
    it(`sends computer_use_preview with the ${expected} environment to older Responses models`, async () => {
      const { fake, setup } = await withOpenaiPlatform({
        respond: responsesApi,
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        assistantData: { modelSlug: 'gpt-5.40' },
      })
      await addComputerUseTool({
        assistantId: setup.assistant.id,
        environment,
      })

      try {
        const { status } = await postMessage({
          assistantId: setup.assistant.id,
          publicApiKey: setup.publicKey.value,
        })

        assert.strictEqual(status, 200)
        const body = runRequest({
          requests: fake.requests,
          path: '/v1/responses',
        })
        assert.deepStrictEqual(body.tools, [
          {
            type: 'computer_use_preview',
            display_width: 1440,
            display_height: 900,
            environment: expected,
          },
        ])
      } finally {
        await fake.close()
      }
    })
  }

  it('references the Azure agent by name when one is configured', async () => {
    const { fake, setup } = await withOpenaiPlatform({
      respond: responsesApi,
      modelProviderType: ModelProviderType.AZURE_OPENAI,
      storageProviderType: StorageProviderType.AZURE_RESPONSES,
      assistantData: {
        azureResponsesAgentName: 'support-agent',
        modelSlug: 'gpt-4.1',
      },
    })

    try {
      const { status } = await postMessage({
        assistantId: setup.assistant.id,
        publicApiKey: setup.publicKey.value,
      })

      assert.strictEqual(status, 200)
      const body = runRequest({
        requests: fake.requests,
        path: '/openai/responses',
      })
      assert.strictEqual(body.agent.name, 'support-agent')
      assert.strictEqual(body.model, undefined)
    } finally {
      await fake.close()
    }
  })

  it('uses the assistant model on Azure Responses without an agent', async () => {
    const { fake, setup } = await withOpenaiPlatform({
      respond: responsesApi,
      modelProviderType: ModelProviderType.AZURE_OPENAI,
      storageProviderType: StorageProviderType.AZURE_RESPONSES,
      assistantData: { modelSlug: 'gpt-4.1' },
    })

    try {
      const { status } = await postMessage({
        assistantId: setup.assistant.id,
        publicApiKey: setup.publicKey.value,
      })

      assert.strictEqual(status, 200)
      const body = runRequest({
        requests: fake.requests,
        path: '/openai/responses',
      })
      assert.strictEqual(body.agent, undefined)
      assert.strictEqual(body.model, 'gpt-4.1')
    } finally {
      await fake.close()
    }
  })
})
