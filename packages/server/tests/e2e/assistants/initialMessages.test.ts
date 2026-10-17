import { testApiHandler } from 'next-test-api-route-handler'
import assert from 'node:assert'
import { describe, it } from 'node:test'
import { MessageRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestAssistantSetup } from '../../lib/assistants/createTestAssistantSetup'

const loadRoute = () =>
  import('../../../src/app/api/assistants/[assistantId]/initial-messages/route')

const call = async ({
  assistantId,
  method,
  headers,
  body,
}: {
  assistantId: string
  method: string
  headers: Record<string, string>
  body?: unknown
}) => {
  let status = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = null
  await testApiHandler({
    appHandler: await loadRoute(),
    params: { assistantId },
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

describe('/api/assistants/[assistantId]/initial-messages', () => {
  it('replaces initial messages and returns them in order', async () => {
    const setup = await createTestAssistantSetup()
    await prisma.initialMessage.create({
      data: {
        assistantId: setup.assistant.id,
        role: MessageRole.USER,
        content: 'stale',
        orderNumber: 0,
      },
    })

    const put = await call({
      assistantId: setup.assistant.id,
      method: 'PUT',
      headers: setup.authHeaders,
      body: {
        initialMessages: [
          { role: MessageRole.ASSISTANT, content: 'Hi! How can I help?' },
          { role: MessageRole.USER, content: 'Show me pricing' },
          { role: MessageRole.ASSISTANT, content: 'Here it is.' },
        ],
      },
    })

    assert.strictEqual(put.status, 200)
    assert.deepStrictEqual(
      put.json.initialMessages.map(
        ({
          role,
          content,
          orderNumber,
          assistantId,
        }: Record<string, unknown>) => ({
          role,
          content,
          orderNumber,
          assistantId,
        }),
      ),
      [
        {
          role: MessageRole.ASSISTANT,
          content: 'Hi! How can I help?',
          orderNumber: 0,
          assistantId: setup.assistant.id,
        },
        {
          role: MessageRole.USER,
          content: 'Show me pricing',
          orderNumber: 1,
          assistantId: setup.assistant.id,
        },
        {
          role: MessageRole.ASSISTANT,
          content: 'Here it is.',
          orderNumber: 2,
          assistantId: setup.assistant.id,
        },
      ],
    )
    assert.ok(put.json.initialMessages.every(({ id }: { id: string }) => id))

    const get = await call({
      assistantId: setup.assistant.id,
      method: 'GET',
      headers: setup.authHeaders,
    })
    assert.strictEqual(get.status, 200)
    assert.deepStrictEqual(get.json.initialMessages, put.json.initialMessages)

    const stored = await prisma.initialMessage.findMany({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(stored.length, 3)
    assert.ok(stored.every(({ content }) => content !== 'stale'))
  })

  it('clears initial messages with an empty list', async () => {
    const setup = await createTestAssistantSetup()
    await prisma.initialMessage.create({
      data: {
        assistantId: setup.assistant.id,
        role: MessageRole.ASSISTANT,
        content: 'Welcome',
        orderNumber: 0,
      },
    })

    const put = await call({
      assistantId: setup.assistant.id,
      method: 'PUT',
      headers: setup.authHeaders,
      body: { initialMessages: [] },
    })

    assert.strictEqual(put.status, 200)
    assert.deepStrictEqual(put.json, { initialMessages: [] })
    const count = await prisma.initialMessage.count({
      where: { assistantId: setup.assistant.id },
    })
    assert.strictEqual(count, 0)

    const get = await call({
      assistantId: setup.assistant.id,
      method: 'GET',
      headers: setup.authHeaders,
    })
    assert.deepStrictEqual(get.json, { initialMessages: [] })
  })

  it('rejects invalid bodies without touching stored messages', async () => {
    const setup = await createTestAssistantSetup()
    await prisma.initialMessage.create({
      data: {
        assistantId: setup.assistant.id,
        role: MessageRole.ASSISTANT,
        content: 'Keep me',
        orderNumber: 0,
      },
    })

    for (const body of [
      {},
      { initialMessages: [{ role: MessageRole.USER, content: '' }] },
      { initialMessages: [{ role: 'SYSTEM', content: 'nope' }] },
    ]) {
      const { status, json } = await call({
        assistantId: setup.assistant.id,
        method: 'PUT',
        headers: setup.authHeaders,
        body,
      })
      assert.strictEqual(status, 400)
      assert.deepStrictEqual(json, { error: 'Invalid body' })
    }

    const stored = await prisma.initialMessage.findMany({
      where: { assistantId: setup.assistant.id },
    })
    assert.deepStrictEqual(
      stored.map(({ content }) => content),
      ['Keep me'],
    )
  })
})
