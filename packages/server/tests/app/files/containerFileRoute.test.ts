import { describe, test } from 'node:test'
import { strict as assert } from 'node:assert'
import { NextRequest } from 'next/server'
import { buildGET } from '../../../src/app/api/files/[fileId]/contents/buildRoute'

const publicApiKey = '94e27564-2105-4980-910a-1c54b0657d88'

const makePrisma = () =>
  ({
    apiKey: {
      findFirst: async () => ({ id: 'api_key_1' }),
    },
    assistant: {
      findFirst: async () => ({
        id: 'assistant_1',
        storageProviderType: 'OPENAI_RESPONSES',
        openaiAssistantId: null,
        modelProvider: {},
        tools: [],
        mcpServers: [],
        functions: [],
      }),
    },
  }) as any

const request = (containerId?: string) => {
  const url = new URL('http://localhost/api/files/cfile_xyz/contents')
  url.searchParams.set('assistantId', 'assistant_1')
  url.searchParams.set('publicApiKey', publicApiKey)
  if (containerId !== undefined)
    url.searchParams.set('containerId', containerId)
  return new NextRequest(url)
}

describe('container file contents route', () => {
  test('uses the container endpoint and never falls through to /v1/files', async () => {
    let containerCall: unknown[] | undefined
    let regularRetrieveCalled = false
    const client = {
      containers: {
        files: {
          content: {
            retrieve: async (...args: unknown[]) => {
              containerCall = args
              return new Response(new Uint8Array([9, 8, 7]), {
                headers: { 'Content-Type': 'image/png' },
              })
            },
          },
        },
      },
      files: {
        retrieve: async () => {
          regularRetrieveCalled = true
          throw new Error('regular file endpoint must not be used')
        },
      },
    }
    const handler = buildGET({
      prisma: makePrisma(),
      getAssistantClient: (() => client) as any,
    })

    const response = await handler(request('cntr_abc'), {
      params: Promise.resolve({ fileId: 'cfile_xyz' }),
    })

    assert.equal(response.status, 200)
    assert.deepEqual(containerCall, ['cfile_xyz', { container_id: 'cntr_abc' }])
    assert.equal(regularRetrieveCalled, false)
    assert.deepEqual(
      Array.from(new Uint8Array(await response.arrayBuffer())),
      [9, 8, 7],
    )
  })

  test('preserves the regular file route when containerId is absent', async () => {
    let regularRetrieveCalled = false
    let regularContentCalled = false
    const client = {
      files: {
        retrieve: async (fileId: string) => {
          regularRetrieveCalled = fileId === 'file_regular'
          return { id: fileId, purpose: 'user_data' }
        },
        content: async (fileId: string) => {
          regularContentCalled = fileId === 'file_regular'
          return new Response(new Uint8Array([1, 2]))
        },
      },
    }
    const handler = buildGET({
      prisma: makePrisma(),
      getAssistantClient: (() => client) as any,
    })

    const response = await handler(request(), {
      params: Promise.resolve({ fileId: 'file_regular' }),
    })

    assert.equal(response.status, 200)
    assert.equal(regularRetrieveCalled, true)
    assert.equal(regularContentCalled, true)
  })

  test('rejects an explicitly empty containerId', async () => {
    const handler = buildGET({
      prisma: makePrisma(),
      getAssistantClient: (() => {
        throw new Error('client must not be used for an invalid container id')
      }) as any,
    })

    const response = await handler(request(''), {
      params: Promise.resolve({ fileId: 'cfile_xyz' }),
    })

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: 'Invalid containerId' })
  })
})
