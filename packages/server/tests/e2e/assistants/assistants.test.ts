import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  AvatarType,
  IconAvatarName,
  StorageProviderType,
  ToolType,
  TruncationType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'

const loadCollection = () => import('../../../src/app/api/assistants/route')

const loadDetail = () =>
  import('../../../src/app/api/assistants/[assistantId]/route')

const lightningBolt = {
  type: AvatarType.ICON,
  imageAvatar: null,
  iconAvatar: { name: IconAvatarName.LIGHTNING_BOLT },
}

describe('GET /api/assistants', () => {
  it('lists only the workspace assistants with tool flags and avatars', async () => {
    const setup = await createTestAssistantSetup({
      storageProviderType: StorageProviderType.AZURE_RESPONSES,
      assistantData: {
        name: 'Azure agent',
        azureResponsesAgentName: 'agent-name',
        openaiAssistantId: 'ignored',
      },
    })
    const withTools = await createTestAssistant({
      data: {
        workspaceId: setup.workspace.id,
        modelProviderId: setup.modelProvider.id,
        name: 'With tools',
        storageProviderType: StorageProviderType.AZURE_AGENTS,
        azureAgentsAgentId: 'asst_azure_agents',
        tools: {
          create: [
            {
              type: ToolType.CODE_INTERPRETER,
              codeInterpreterTool: { create: {} },
            },
            { type: ToolType.FILE_SEARCH, fileSearchTool: { create: {} } },
          ],
        },
        avatar: {
          create: {
            type: AvatarType.IMAGE,
            imageAvatar: { create: { url: 'https://example.com/a.png' } },
          },
        },
      },
    })
    const withIcon = await createTestAssistant({
      data: {
        workspaceId: setup.workspace.id,
        modelProviderId: setup.modelProvider.id,
        name: 'With icon',
        storageProviderType: StorageProviderType.OPENAI,
        openaiAssistantId: 'asst_openai',
        tools: {
          create: [
            { type: ToolType.WEB_SEARCH, webSearchTool: { create: {} } },
          ],
        },
        avatar: {
          create: {
            type: AvatarType.ICON,
            iconAvatar: { create: { name: IconAvatarName.ROCKET } },
          },
        },
      },
    })
    const foreign = await createTestAssistantSetup()

    await testApiHandler({
      appHandler: await loadCollection(),
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'GET',
          headers: setup.authHeaders,
        })
        assert.strictEqual(response.status, 200)
        assert.strictEqual(
          response.headers.get('access-control-allow-origin'),
          '*',
        )
        const { assistants } = await response.json()
        const byId = Object.fromEntries(
          assistants.map((a: { id: string }) => [a.id, a]),
        )

        assert.strictEqual(assistants.length, 3)
        assert.strictEqual(byId[foreign.assistant.id], undefined)

        assert.strictEqual(
          byId[setup.assistant.id].storageProviderAssistantId,
          'agent-name',
        )
        assert.strictEqual(
          byId[setup.assistant.id].codeInterpreterEnabled,
          false,
        )
        assert.strictEqual(byId[setup.assistant.id].fileSearchEnabled, false)
        assert.deepStrictEqual(byId[setup.assistant.id].avatar, lightningBolt)

        assert.strictEqual(
          byId[withTools.id].storageProviderAssistantId,
          'asst_azure_agents',
        )
        assert.strictEqual(byId[withTools.id].codeInterpreterEnabled, true)
        assert.strictEqual(byId[withTools.id].fileSearchEnabled, true)
        assert.deepStrictEqual(byId[withTools.id].avatar, {
          type: AvatarType.IMAGE,
          imageAvatar: { url: 'https://example.com/a.png' },
          iconAvatar: null,
        })

        assert.strictEqual(
          byId[withIcon.id].storageProviderAssistantId,
          'asst_openai',
        )
        assert.strictEqual(byId[withIcon.id].codeInterpreterEnabled, false)
        assert.strictEqual(byId[withIcon.id].fileSearchEnabled, false)
        assert.deepStrictEqual(byId[withIcon.id].avatar, {
          type: AvatarType.ICON,
          imageAvatar: null,
          iconAvatar: { name: IconAvatarName.ROCKET },
        })
      },
    })
  })
})

describe('POST /api/assistants', () => {
  const post = async ({
    authHeaders,
    body,
  }: {
    authHeaders: Record<string, string>
    body: unknown
  }) => {
    let status = 0
    let json: Record<string, unknown> & {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assistant?: any
      error?: string
    } = {}
    await testApiHandler({
      appHandler: await loadCollection(),
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(body),
        })
        status = response.status
        json = await response.json()
      },
    })
    return { status, json }
  }

  it('rejects bodies missing required fields', async () => {
    const setup = await createTestAssistantSetup()
    const { status, json } = await post({
      authHeaders: setup.authHeaders,
      body: { storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD },
    })

    assert.strictEqual(status, 400)
    assert.match(json.error!, /^Missing required fields\. /)
    assert.match(json.error!, /modelProviderId/)
  })

  it('rejects storageProviderAssistantId for storage types that do not use it', async () => {
    const setup = await createTestAssistantSetup()
    for (const storageProviderType of [
      StorageProviderType.SUPERINTERFACE_CLOUD,
      StorageProviderType.AZURE_RESPONSES,
    ]) {
      const { status, json } = await post({
        authHeaders: setup.authHeaders,
        body: {
          storageProviderType,
          storageProviderAssistantId: 'asst_unexpected',
          modelProviderId: setup.modelProvider.id,
          model: 'gpt-4o-mini',
        },
      })

      assert.strictEqual(status, 400)
      assert.match(json.error!, /should not be provided/)
    }
  })

  it('requires storageProviderAssistantId for assistants-style storage types', async () => {
    const setup = await createTestAssistantSetup()
    for (const storageProviderType of [
      StorageProviderType.OPENAI,
      StorageProviderType.AZURE_AGENTS,
    ]) {
      const { status, json } = await post({
        authHeaders: setup.authHeaders,
        body: {
          storageProviderType,
          modelProviderId: setup.modelProvider.id,
          model: 'gpt-4o-mini',
        },
      })

      assert.strictEqual(status, 400)
      assert.match(json.error!, /is required for this storage provider/)
    }

    const count = await prisma.assistant.count({
      where: { workspaceId: setup.workspace.id },
    })
    assert.strictEqual(count, 1)
  })

  it('creates an assistant with code interpreter and file search tools', async () => {
    const setup = await createTestAssistantSetup()
    const { status, json } = await post({
      authHeaders: setup.authHeaders,
      body: {
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        modelProviderId: setup.modelProvider.id,
        model: 'gpt-4.1',
        name: 'Tooling',
        description: 'Has tools',
        instructions: 'Use tools.',
        codeInterpreterEnabled: true,
        fileSearchEnabled: true,
        truncationType: TruncationType.LAST_MESSAGES,
        truncationLastMessagesCount: 7,
      },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.codeInterpreterEnabled, true)
    assert.strictEqual(json.assistant.fileSearchEnabled, true)
    assert.strictEqual(json.assistant.storageProviderAssistantId, null)
    assert.strictEqual(json.assistant.model, 'gpt-4.1')
    assert.strictEqual(json.assistant.description, 'Has tools')
    assert.strictEqual(json.assistant.instructions, 'Use tools.')
    assert.strictEqual(json.assistant.truncationLastMessagesCount, 7)
    assert.deepStrictEqual(json.assistant.avatar, lightningBolt)

    const stored = await prisma.assistant.findUniqueOrThrow({
      where: { id: json.assistant.id },
      include: {
        tools: { include: { fileSearchTool: true, codeInterpreterTool: true } },
      },
    })
    assert.strictEqual(stored.workspaceId, setup.workspace.id)
    assert.deepStrictEqual(stored.tools.map(({ type }) => type).sort(), [
      ToolType.CODE_INTERPRETER,
      ToolType.FILE_SEARCH,
    ])
    assert.ok(
      stored.tools.every((t) => t.fileSearchTool || t.codeInterpreterTool),
    )
  })

  it('stores an empty Azure Responses agent name and defaults optional fields', async () => {
    const setup = await createTestAssistantSetup()
    const { status, json } = await post({
      authHeaders: setup.authHeaders,
      body: {
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
        storageProviderAssistantId: '',
        modelProviderId: setup.modelProvider.id,
        model: 'gpt-4o',
      },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.storageProviderAssistantId, '')
    assert.strictEqual(json.assistant.name, '')
    assert.strictEqual(json.assistant.description, '')
    assert.strictEqual(json.assistant.instructions, '')
    assert.strictEqual(json.assistant.codeInterpreterEnabled, false)
    assert.strictEqual(json.assistant.fileSearchEnabled, false)
    assert.strictEqual(json.assistant.truncationType, TruncationType.AUTO)

    const stored = await prisma.assistant.findUniqueOrThrow({
      where: { id: json.assistant.id },
    })
    assert.strictEqual(stored.azureResponsesAgentName, '')
    assert.strictEqual(stored.openaiAssistantId, null)
    assert.strictEqual(stored.azureAgentsAgentId, null)
  })

  it('stores a null Azure Responses agent name when explicitly null', async () => {
    const setup = await createTestAssistantSetup()
    const { status, json } = await post({
      authHeaders: setup.authHeaders,
      body: {
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
        storageProviderAssistantId: null,
        modelProviderId: setup.modelProvider.id,
        model: 'gpt-4o',
      },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.storageProviderAssistantId, null)
  })
})

describe('GET /api/assistants/[assistantId]', () => {
  const get = async ({
    assistantId,
    headers = {},
    query = '',
  }: {
    assistantId: string
    headers?: Record<string, string>
    query?: string
  }) => {
    let status = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = {}
    await testApiHandler({
      appHandler: await loadDetail(),
      params: { assistantId },
      url: `/api/assistants/${assistantId}${query}`,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET', headers })
        status = response.status
        json = await response.json()
      },
    })
    return { status, json }
  }

  it('rejects a private key for an unknown assistant', async () => {
    const setup = await createTestAssistantSetup()
    const { status, json } = await get({
      assistantId: randomUUID(),
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'No assistant found' })
  })

  it('rejects an authorization header that is not a private key', async () => {
    const setup = await createTestAssistantSetup()

    for (const authorization of [
      `Bearer ${randomUUID()}`,
      `Bearer ${setup.publicKey.value}`,
    ]) {
      const { status, json } = await get({
        assistantId: setup.assistant.id,
        headers: { Authorization: authorization },
      })

      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'Invalid api key' })
    }
  })

  it('returns the private serialization with an icon avatar', async () => {
    const setup = await createTestAssistantSetup({
      assistantData: {
        avatar: {
          create: {
            type: AvatarType.ICON,
            iconAvatar: { create: { name: IconAvatarName.CUBE } },
          },
        },
      },
    })
    const { status, json } = await get({
      assistantId: setup.assistant.id,
      headers: setup.authHeaders,
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.id, setup.assistant.id)
    assert.strictEqual(json.assistant.modelProviderId, setup.modelProvider.id)
    assert.deepStrictEqual(json.assistant.avatar, {
      type: AvatarType.ICON,
      imageAvatar: null,
      iconAvatar: { name: IconAvatarName.CUBE },
    })
  })

  it('requires a valid public API key without an authorization header', async () => {
    const setup = await createTestAssistantSetup()

    const missing = await get({ assistantId: setup.assistant.id })
    assert.strictEqual(missing.status, 400)
    assert.deepStrictEqual(missing.json, { error: 'Invalid api key' })

    const privateAsPublic = await get({
      assistantId: setup.assistant.id,
      query: `?publicApiKey=${setup.privateKey.value}`,
    })
    assert.strictEqual(privateAsPublic.status, 400)
    assert.deepStrictEqual(privateAsPublic.json, { error: 'Invalid api key' })
  })

  it('requires an assistant id on the public path', async () => {
    const setup = await createTestAssistantSetup()
    const { status, json } = await get({
      assistantId: '',
      query: `?publicApiKey=${setup.publicKey.value}`,
    })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'No assistant id found' })
  })

  it('does not expose assistants of other workspaces to a public key', async () => {
    const setup = await createTestAssistantSetup()
    const other = await createTestAssistantSetup()
    const { status, json } = await get({
      assistantId: other.assistant.id,
      query: `?publicApiKey=${setup.publicKey.value}`,
    })

    assert.strictEqual(status, 400)
    assert.deepStrictEqual(json, { error: 'No assistant found' })
  })

  it('returns the public serialization with theme and fallback name', async () => {
    const setup = await createTestAssistantSetup({
      assistantData: {
        name: '',
        description: 'Public description',
        instructions: 'secret instructions',
      },
    })
    const { status, json } = await get({
      assistantId: setup.assistant.id,
      query: `?publicApiKey=${setup.publicKey.value}`,
    })

    assert.strictEqual(status, 200)
    assert.deepStrictEqual(json.assistant, {
      id: setup.assistant.id,
      name: 'Untitled assistant',
      description: 'Public description',
      theme: {
        accentColor: 'blue',
        grayColor: 'gray',
        appearance: 'light',
        radius: 'medium',
        scaling: '100%',
        panelBackground: 'solid',
      },
      avatar: lightningBolt,
    })
  })

  it('returns the public serialization with name and image avatar', async () => {
    const setup = await createTestAssistantSetup({
      assistantData: {
        name: 'Helper',
        avatar: {
          create: {
            type: AvatarType.IMAGE,
            imageAvatar: { create: { url: 'https://example.com/h.png' } },
          },
        },
      },
    })
    const { status, json } = await get({
      assistantId: setup.assistant.id,
      query: `?publicApiKey=${setup.publicKey.value}`,
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.name, 'Helper')
    assert.deepStrictEqual(json.assistant.avatar, {
      type: AvatarType.IMAGE,
      imageAvatar: { url: 'https://example.com/h.png' },
      iconAvatar: null,
    })
    assert.strictEqual(json.assistant.instructions, undefined)
  })
})

describe('PATCH /api/assistants/[assistantId]', () => {
  const patch = async ({
    assistantId,
    authHeaders,
    body,
  }: {
    assistantId: string
    authHeaders: Record<string, string>
    body: unknown
  }) => {
    let status = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = {}
    await testApiHandler({
      appHandler: await loadDetail(),
      params: { assistantId },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify(body),
        })
        status = response.status
        json = await response.json()
      },
    })
    return { status, json }
  }

  it('rejects malformed bodies', async () => {
    const setup = await createTestAssistantSetup()
    const { status, json } = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: { name: 42 },
    })

    assert.strictEqual(status, 400)
    assert.match(json.error, /^Invalid body: /)
  })

  it('validates storageProviderAssistantId against the new storage type', async () => {
    const setup = await createTestAssistantSetup()

    const cloudWithId = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: {
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        storageProviderAssistantId: 'asst_nope',
      },
    })
    assert.strictEqual(cloudWithId.status, 400)
    assert.match(cloudWithId.json.error, /should not be provided/)

    const openaiWithoutId = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: { storageProviderType: StorageProviderType.OPENAI },
    })
    assert.strictEqual(openaiWithoutId.status, 400)
    assert.match(openaiWithoutId.json.error, /is required/)

    const stored = await prisma.assistant.findUniqueOrThrow({
      where: { id: setup.assistant.id },
    })
    assert.strictEqual(
      stored.storageProviderType,
      StorageProviderType.OPENAI_RESPONSES,
    )
  })

  it('switches to SUPERINTERFACE_CLOUD and clears every storage id', async () => {
    const setup = await createTestAssistantSetup({
      storageProviderType: StorageProviderType.AZURE_AGENTS,
      assistantData: { azureAgentsAgentId: 'asst_old' },
    })
    const { status, json } = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: {
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        storageProviderAssistantId: null,
      },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(
      json.assistant.storageProviderType,
      'SUPERINTERFACE_CLOUD',
    )
    assert.strictEqual(json.assistant.storageProviderAssistantId, null)
    const stored = await prisma.assistant.findUniqueOrThrow({
      where: { id: setup.assistant.id },
    })
    assert.strictEqual(stored.azureAgentsAgentId, null)
    assert.strictEqual(stored.openaiAssistantId, null)
    assert.strictEqual(stored.azureResponsesAgentName, null)
  })

  it('switches to SUPERINTERFACE_CLOUD without touching storage ids when none are sent', async () => {
    const setup = await createTestAssistantSetup({
      storageProviderType: StorageProviderType.OPENAI,
      assistantData: { openaiAssistantId: 'asst_keep' },
    })
    const { status } = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: { storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD },
    })

    assert.strictEqual(status, 200)
    const stored = await prisma.assistant.findUniqueOrThrow({
      where: { id: setup.assistant.id },
    })
    assert.strictEqual(stored.storageProviderType, 'SUPERINTERFACE_CLOUD')
    assert.strictEqual(stored.openaiAssistantId, 'asst_keep')
  })

  it('stores the Azure Responses agent name when switching storage types', async () => {
    const setup = await createTestAssistantSetup({
      storageProviderType: StorageProviderType.OPENAI,
      assistantData: { openaiAssistantId: 'asst_old' },
    })
    const { status, json } = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: {
        storageProviderType: StorageProviderType.AZURE_RESPONSES,
        storageProviderAssistantId: 'responses-agent',
      },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(
      json.assistant.storageProviderAssistantId,
      'responses-agent',
    )
    const stored = await prisma.assistant.findUniqueOrThrow({
      where: { id: setup.assistant.id },
    })
    assert.strictEqual(stored.azureResponsesAgentName, 'responses-agent')
    assert.strictEqual(stored.openaiAssistantId, null)
    assert.strictEqual(stored.azureAgentsAgentId, null)
  })

  it('uses the existing storage type when only the storage id changes', async () => {
    const setup = await createTestAssistantSetup({
      storageProviderType: StorageProviderType.AZURE_RESPONSES,
      assistantData: { azureResponsesAgentName: 'old-agent' },
    })
    const { status, json } = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: { storageProviderAssistantId: 'new-agent' },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.storageProviderType, 'AZURE_RESPONSES')
    assert.strictEqual(json.assistant.storageProviderAssistantId, 'new-agent')

    const azureAgents = await createTestAssistantSetup({
      storageProviderType: StorageProviderType.AZURE_AGENTS,
      assistantData: { azureAgentsAgentId: 'old-agent' },
    })
    const agentsResult = await patch({
      assistantId: azureAgents.assistant.id,
      authHeaders: azureAgents.authHeaders,
      body: { storageProviderAssistantId: 'asst_new_agents' },
    })
    assert.strictEqual(agentsResult.status, 200)
    const stored = await prisma.assistant.findUniqueOrThrow({
      where: { id: azureAgents.assistant.id },
    })
    assert.strictEqual(stored.azureAgentsAgentId, 'asst_new_agents')
  })

  it('updates scalar fields, model provider and enables built-in tools', async () => {
    const setup = await createTestAssistantSetup()
    const newProvider = await createTestModelProvider({
      data: { workspaceId: setup.workspace.id, name: 'Second provider' },
    })
    const { status, json } = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: {
        modelProviderId: newProvider.id,
        model: 'gpt-5',
        name: 'Renamed',
        description: 'New description',
        instructions: 'New instructions',
        truncationLastMessagesCount: null,
        codeInterpreterEnabled: true,
        fileSearchEnabled: true,
      },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.modelProviderId, newProvider.id)
    assert.strictEqual(json.assistant.model, 'gpt-5')
    assert.strictEqual(json.assistant.name, 'Renamed')
    assert.strictEqual(json.assistant.description, 'New description')
    assert.strictEqual(json.assistant.instructions, 'New instructions')
    assert.strictEqual(json.assistant.truncationLastMessagesCount, null)
    assert.strictEqual(json.assistant.codeInterpreterEnabled, true)
    assert.strictEqual(json.assistant.fileSearchEnabled, true)
  })

  it('disables built-in tools and leaves other fields untouched', async () => {
    const setup = await createTestAssistantSetup({
      assistantData: {
        name: 'Keep me',
        tools: {
          create: [
            {
              type: ToolType.CODE_INTERPRETER,
              codeInterpreterTool: { create: {} },
            },
            { type: ToolType.FILE_SEARCH, fileSearchTool: { create: {} } },
            { type: ToolType.WEB_SEARCH, webSearchTool: { create: {} } },
          ],
        },
      },
    })
    const { status, json } = await patch({
      assistantId: setup.assistant.id,
      authHeaders: setup.authHeaders,
      body: { codeInterpreterEnabled: false, fileSearchEnabled: false },
    })

    assert.strictEqual(status, 200)
    assert.strictEqual(json.assistant.codeInterpreterEnabled, false)
    assert.strictEqual(json.assistant.fileSearchEnabled, false)
    assert.strictEqual(json.assistant.name, 'Keep me')
    const tools = await prisma.tool.findMany({
      where: { assistantId: setup.assistant.id },
    })
    assert.deepStrictEqual(
      tools.map(({ type }) => type),
      [ToolType.WEB_SEARCH],
    )
  })
})

describe('DELETE /api/assistants/[assistantId]', () => {
  it('deletes the assistant and returns its last state', async () => {
    const setup = await createTestAssistantSetup({
      assistantData: {
        name: 'Doomed',
        tools: {
          create: [
            { type: ToolType.FILE_SEARCH, fileSearchTool: { create: {} } },
          ],
        },
      },
    })

    await testApiHandler({
      appHandler: await loadDetail(),
      params: { assistantId: setup.assistant.id },
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'DELETE',
          headers: setup.authHeaders,
        })
        assert.strictEqual(response.status, 200)
        const { assistant } = await response.json()
        assert.strictEqual(assistant.id, setup.assistant.id)
        assert.strictEqual(assistant.name, 'Doomed')
        assert.strictEqual(assistant.fileSearchEnabled, true)
      },
    })

    const stored = await prisma.assistant.findUnique({
      where: { id: setup.assistant.id },
    })
    assert.strictEqual(stored, null)
    const tools = await prisma.tool.count({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(tools, 0)
  })
})
