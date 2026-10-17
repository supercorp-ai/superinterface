import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { ApiKeyType, AvatarType, IconAvatarName } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../../lib/workspaces/createTestWorkspace'
import { createTestApiKey } from '../../lib/apiKeys/createTestApiKey'
import { createTestModelProvider } from '../../lib/modelProviders/createTestModelProvider'
import { createTestAssistant } from '../../lib/assistants/createTestAssistant'
import { corsHeadersOf } from '../../lib/http/corsHeadersOf'

// Public api keys grant read access to the assistants of their workspace.
describe('public api key access to /api/assistants/[assistantId]', () => {
  const fetchAssistant = async ({
    assistantId,
    publicApiKey,
    method = 'GET',
  }: {
    assistantId: string
    publicApiKey?: string
    method?: string
  }) => {
    const appHandler = await import(
      '../../../src/app/api/assistants/[assistantId]/route'
    )
    let result: { status: number; body: unknown; headers: Headers } = {
      status: 0,
      body: null,
      headers: new Headers(),
    }
    const query = publicApiKey
      ? `?publicApiKey=${encodeURIComponent(publicApiKey)}`
      : ''

    await testApiHandler({
      appHandler,
      params: { assistantId },
      url: `/api/assistants/${assistantId}${query}`,
      test: async ({ fetch }) => {
        const response = await fetch({ method })
        result = {
          status: response.status,
          body: await response.json(),
          headers: response.headers,
        }
      },
    })

    return result
  }

  const createAssistantWithKeys = async () => {
    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: { workspaceId: workspace.id },
    })
    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        name: 'Greeter',
      },
    })
    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })
    const privateKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PRIVATE },
    })
    return { assistant, publicKey, privateKey }
  }

  const defaultTheme = {
    accentColor: 'blue',
    grayColor: 'gray',
    appearance: 'light',
    radius: 'medium',
    scaling: '100%',
    panelBackground: 'solid',
  }

  // The first test loads the route module, so it covers the public
  // serialization (named and unnamed, image and default avatars) and the
  // CORS preflight answer.
  it('serves the assistant to a public key of its workspace', async () => {
    const { assistant, publicKey } = await createAssistantWithKeys()
    await prisma.avatar.create({
      data: {
        assistantId: assistant.id,
        type: AvatarType.IMAGE,
        imageAvatar: { create: { url: 'https://example.com/greeter.png' } },
      },
    })
    const unnamed = await createTestAssistant({
      data: {
        workspaceId: assistant.workspaceId,
        modelProviderId: assistant.modelProviderId,
        name: '',
        description: 'No name yet',
      },
    })

    const response = await fetchAssistant({
      assistantId: assistant.id,
      publicApiKey: publicKey.value,
    })

    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(response.body, {
      assistant: {
        id: assistant.id,
        name: 'Greeter',
        description: assistant.description,
        theme: defaultTheme,
        avatar: {
          type: AvatarType.IMAGE,
          imageAvatar: { url: 'https://example.com/greeter.png' },
          iconAvatar: null,
        },
      },
    })
    assert.strictEqual(response.headers.get('access-control-allow-origin'), '*')

    const unnamedResponse = await fetchAssistant({
      assistantId: unnamed.id,
      publicApiKey: publicKey.value,
    })

    assert.strictEqual(unnamedResponse.status, 200)
    assert.deepStrictEqual(unnamedResponse.body, {
      assistant: {
        id: unnamed.id,
        name: 'Untitled assistant',
        description: 'No name yet',
        theme: defaultTheme,
        avatar: {
          type: AvatarType.ICON,
          imageAvatar: null,
          iconAvatar: { name: IconAvatarName.LIGHTNING_BOLT },
        },
      },
    })

    const options = await fetchAssistant({
      assistantId: assistant.id,
      method: 'OPTIONS',
    })
    assert.strictEqual(options.status, 200)
    assert.deepStrictEqual(options.body, {})
    assert.deepStrictEqual(corsHeadersOf({ headers: options.headers }), {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers':
        'Content-Type, Authorization, X-Requested-With, Accept',
    })
  })

  it('rejects missing, malformed, unknown and private keys', async () => {
    const { assistant, privateKey } = await createAssistantWithKeys()

    for (const publicApiKey of [
      undefined,
      'not-a-uuid',
      randomUUID(),
      privateKey.value,
    ]) {
      const response = await fetchAssistant({
        assistantId: assistant.id,
        publicApiKey,
      })
      assert.strictEqual(response.status, 400)
      assert.deepStrictEqual(response.body, { error: 'Invalid api key' })
    }
  })

  it('does not serve assistants of other workspaces', async () => {
    const { assistant } = await createAssistantWithKeys()
    const { publicKey: foreignKey } = await createAssistantWithKeys()

    const response = await fetchAssistant({
      assistantId: assistant.id,
      publicApiKey: foreignKey.value,
    })

    assert.strictEqual(response.status, 400)
    assert.deepStrictEqual(response.body, { error: 'No assistant found' })
  })
})
