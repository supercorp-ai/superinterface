import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { Prisma, StorageProviderType } from '@prisma/client'
import { testApiHandler } from 'next-test-api-route-handler'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPublicAssistant } from '../../lib/assistants/createPublicAssistant'
import { startFakeOpenai } from '../../lib/openai/startFakeOpenai'

describe('/api/files', () => {
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>

  before(async () => {
    fakeOpenai = await startFakeOpenai({
      handle: ({ request }) => {
        if (request.method !== 'GET') return undefined

        if (request.path === '/files/file-missing') {
          return { type: 'json', json: null }
        }

        if (request.path === '/files/file-assistants') {
          return {
            type: 'json',
            json: {
              id: 'file-assistants',
              object: 'file',
              purpose: 'assistants',
            },
          }
        }

        if (request.path === '/files/file-bare/content') {
          return { type: 'raw', body: 'bare-bytes' }
        }

        if (request.path === '/files/file-typed/content') {
          return {
            type: 'raw',
            body: 'typed-bytes',
            headers: {
              'content-type': 'application/pdf',
              'content-disposition': 'attachment; filename="doc.pdf"',
            },
          }
        }

        if (request.path === '/containers/cntr_typed/files/cfile_1/content') {
          return {
            type: 'raw',
            body: 'png-bytes',
            headers: {
              'content-type': 'image/png',
              'content-disposition': 'attachment; filename="chart.png"',
            },
          }
        }

        if (request.path === '/containers/cntr_bare/files/cfile_1/content') {
          return { type: 'raw', body: 'container-bytes' }
        }

        return undefined
      },
    })
    process.env.OPENAI_BASE_URL = fakeOpenai.baseURL
  })

  after(async () => {
    await fakeOpenai.close()
  })

  const openaiAssistant = ({
    assistant = {},
  }: {
    assistant?: Partial<Prisma.AssistantUncheckedCreateInput>
  } = {}) =>
    createPublicAssistant({
      assistant: {
        storageProviderType: StorageProviderType.OPENAI,
        openaiAssistantId: 'asst_openai',
        ...assistant,
      },
    })

  const upload = async ({
    fields,
  }: {
    fields: Record<string, string | Blob>
  }) => {
    const appHandler = await import('../../../src/app/api/files/route')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: { status: number; headers: Headers; json: any } | undefined

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const body = new FormData()
        for (const [key, value] of Object.entries(fields)) {
          body.append(key, value)
        }
        const response = await fetch({ method: 'POST', body })
        result = {
          status: response.status,
          headers: response.headers,
          json: await response.json(),
        }
      },
    })

    return result!
  }

  const fileContents = async ({
    fileId,
    query,
  }: {
    fileId: string
    query: Record<string, string>
  }) => {
    const appHandler = await import(
      '../../../src/app/api/files/[fileId]/contents/route'
    )
    let result: { status: number; headers: Headers; text: string } | undefined

    await testApiHandler({
      appHandler,
      params: { fileId },
      url: `/api/files/${fileId}/contents?${new URLSearchParams(query)}`,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' })
        result = {
          status: response.status,
          headers: response.headers,
          text: await response.text(),
        }
      },
    })

    return result!
  }

  const file = () =>
    new File(['hello world'], 'hello.txt', { type: 'text/plain' })

  const corsHeaders = ({ response }: { response: Response }) => ({
    origin: response.headers.get('access-control-allow-origin'),
    methods: response.headers.get('access-control-allow-methods'),
    headers: response.headers.get('access-control-allow-headers'),
  })

  const allowedCors = {
    origin: '*',
    methods: 'GET, POST, PUT, DELETE, OPTIONS',
    headers: 'Content-Type, Authorization, X-Requested-With, Accept',
  }

  // Sends an OPTIONS preflight and checks the empty CORS answer.
  const assertPreflight = async ({
    appHandler,
    params,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appHandler: any
    params?: Record<string, string>
  }) => {
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'OPTIONS' })

        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(await response.json(), {})
        assert.deepStrictEqual(corsHeaders({ response }), allowedCors)
      },
    })
  }

  describe('POST /api/files', () => {
    // Runs first so this test is the one that loads the route module.
    it('answers OPTIONS preflight and validates the request before uploading', async () => {
      await assertPreflight({
        appHandler: await import('../../../src/app/api/files/route'),
      })

      const { assistant, publicApiKey } = await openaiAssistant()
      const { assistant: otherAssistant } = await openaiAssistant()
      const { assistant: unfinished, publicApiKey: unfinishedKey } =
        await openaiAssistant({ assistant: { openaiAssistantId: null } })

      const cases: { fields: Record<string, string | Blob>; error: string }[] =
        [
          {
            fields: { publicApiKey, file: file() },
            error: 'Invalid assistantId',
          },
          {
            fields: { assistantId: assistant.id, file: file() },
            error: 'Invalid publicApiKey',
          },
          {
            fields: {
              assistantId: assistant.id,
              publicApiKey: randomUUID(),
              file: file(),
            },
            error: 'Invalid api key',
          },
          {
            fields: { assistantId: '', publicApiKey, file: file() },
            error: 'No assistantId found',
          },
          {
            fields: { assistantId: assistant.id, publicApiKey },
            error: 'No file found',
          },
          {
            fields: {
              assistantId: otherAssistant.id,
              publicApiKey,
              file: file(),
            },
            error: 'No assistant found',
          },
          {
            fields: {
              assistantId: unfinished.id,
              publicApiKey: unfinishedKey,
              file: file(),
            },
            error: 'Assistant setup is not done.',
          },
        ]

      for (const { fields, error } of cases) {
        const { status, json } = await upload({ fields })

        assert.strictEqual(status, 400)
        assert.deepStrictEqual(json, { error })
      }

      assert.strictEqual(
        fakeOpenai.find({ method: 'POST', path: '/files' }).length,
        0,
      )
    })

    it('uploads to OpenAI with a 30 day expiry', async () => {
      const { assistant, publicApiKey } = await openaiAssistant()

      const { status, json, headers } = await upload({
        fields: { assistantId: assistant.id, publicApiKey, file: file() },
      })

      assert.strictEqual(status, 200)
      assert.match(json.file.id, /^file-/)
      assert.strictEqual(headers.get('access-control-allow-origin'), '*')
      const [request] = fakeOpenai.find({ method: 'POST', path: '/files' })
      assert.match(request.body, /name="purpose"\r\n\r\nassistants\r\n/)
      assert.match(
        request.body,
        /name="expires_after\[anchor\]"\r\n\r\ncreated_at\r\n/,
      )
      assert.match(
        request.body,
        /name="expires_after\[seconds\]"\r\n\r\n2592000\r\n/,
      )
      assert.match(request.body, /hello world/)
    })

    it('uploads with an explicit purpose and no expiry elsewhere', async () => {
      const { assistant, publicApiKey } = await createPublicAssistant({
        assistant: {
          storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        },
      })
      fakeOpenai.requests.length = 0

      const { status } = await upload({
        fields: {
          assistantId: assistant.id,
          publicApiKey,
          purpose: 'user_data',
          file: file(),
        },
      })

      assert.strictEqual(status, 200)
      const [request] = fakeOpenai.find({ method: 'POST', path: '/files' })
      assert.match(request.body, /name="purpose"\r\n\r\nuser_data\r\n/)
      assert.ok(!request.body.includes('expires_after'))
    })
  })

  describe('GET /api/files/[fileId]/contents', () => {
    // Runs first so this test is the one that loads the route module.
    it('answers OPTIONS preflight and validates the request before fetching', async () => {
      await assertPreflight({
        appHandler: await import(
          '../../../src/app/api/files/[fileId]/contents/route'
        ),
        params: { fileId: 'file-1' },
      })

      const { assistant, publicApiKey } = await openaiAssistant()
      const { assistant: otherAssistant } = await openaiAssistant()
      const { assistant: unfinished, publicApiKey: unfinishedKey } =
        await openaiAssistant({ assistant: { openaiAssistantId: null } })

      const cases: { query: Record<string, string>; error: string }[] = [
        { query: { publicApiKey }, error: 'Invalid assistantId' },
        { query: { assistantId: assistant.id }, error: 'Invalid publicApiKey' },
        {
          query: { assistantId: assistant.id, publicApiKey: randomUUID() },
          error: 'Invalid api key',
        },
        {
          query: { assistantId: '', publicApiKey },
          error: 'No assistantId found',
        },
        {
          query: { assistantId: otherAssistant.id, publicApiKey },
          error: 'No assistant found',
        },
        {
          query: { assistantId: unfinished.id, publicApiKey: unfinishedKey },
          error: 'Assistant setup is not done.',
        },
        {
          query: { assistantId: assistant.id, publicApiKey, containerId: '' },
          error: 'Invalid containerId',
        },
      ]

      for (const { query, error } of cases) {
        const { status, text } = await fileContents({ fileId: 'file-1', query })

        assert.strictEqual(status, 400)
        assert.deepStrictEqual(JSON.parse(text), { error })
      }
    })

    it('streams container files with upstream or default headers', async () => {
      const { assistant, publicApiKey } = await openaiAssistant()

      const typed = await fileContents({
        fileId: 'cfile_1',
        query: {
          assistantId: assistant.id,
          publicApiKey,
          containerId: 'cntr_typed',
        },
      })

      assert.strictEqual(typed.status, 200)
      assert.strictEqual(typed.text, 'png-bytes')
      assert.strictEqual(typed.headers.get('content-type'), 'image/png')
      assert.strictEqual(
        typed.headers.get('content-disposition'),
        'attachment; filename="chart.png"',
      )

      const bare = await fileContents({
        fileId: 'cfile_1',
        query: {
          assistantId: assistant.id,
          publicApiKey,
          containerId: 'cntr_bare',
        },
      })

      assert.strictEqual(bare.status, 200)
      assert.strictEqual(bare.text, 'container-bytes')
      assert.strictEqual(
        bare.headers.get('content-type'),
        'application/octet-stream',
      )
      assert.strictEqual(bare.headers.get('content-disposition'), 'inline')
      assert.strictEqual(
        fakeOpenai.find({ method: 'GET', path: /^\/files\// }).length,
        0,
      )
    })

    it('returns file contents with upstream or default headers', async () => {
      const { assistant, publicApiKey } = await openaiAssistant()
      const query = { assistantId: assistant.id, publicApiKey }

      const typed = await fileContents({ fileId: 'file-typed', query })

      assert.strictEqual(typed.status, 200)
      assert.strictEqual(typed.text, 'typed-bytes')
      assert.strictEqual(typed.headers.get('content-type'), 'application/pdf')
      assert.strictEqual(
        typed.headers.get('content-disposition'),
        'attachment; filename="doc.pdf"',
      )

      const bare = await fileContents({ fileId: 'file-bare', query })

      assert.strictEqual(bare.status, 200)
      assert.strictEqual(bare.text, 'bare-bytes')
      assert.strictEqual(
        bare.headers.get('content-type'),
        'application/octet-stream',
      )
      assert.strictEqual(bare.headers.get('content-disposition'), 'inline')
    })

    it('returns 404 for missing files and assistants-purpose files', async () => {
      const { assistant, publicApiKey } = await openaiAssistant()
      const query = { assistantId: assistant.id, publicApiKey }

      const missing = await fileContents({ fileId: 'file-missing', query })

      assert.strictEqual(missing.status, 404)
      assert.deepStrictEqual(JSON.parse(missing.text), {
        error: 'No file found',
      })

      const assistantsFile = await fileContents({
        fileId: 'file-assistants',
        query,
      })

      assert.strictEqual(assistantsFile.status, 404)
      assert.deepStrictEqual(JSON.parse(assistantsFile.text), {
        error: 'No file source found',
      })
      assert.strictEqual(
        fakeOpenai.find({
          method: 'GET',
          path: '/files/file-assistants/content',
        }).length,
        0,
      )
    })

    it('lets the embedding app serve assistants-purpose files', async () => {
      const { assistant, publicApiKey } = await openaiAssistant()
      const { buildGET } = await import(
        '../../../src/app/api/files/[fileId]/contents/buildRoute'
      )
      const seen: { fileId: string; workspaceWhere: unknown }[] = []
      const GET = buildGET({
        prisma,
        purposeAssistantsResponse: ({
          file: assistantsFile,
          workspaceAccessWhere,
        }) => {
          seen.push({
            fileId: assistantsFile.id,
            workspaceWhere: workspaceAccessWhere,
          })
          return NextResponse.json({ source: 'custom' })
        },
      })

      await testApiHandler({
        appHandler: { GET },
        params: { fileId: 'file-assistants' },
        url: `/api/files/file-assistants/contents?${new URLSearchParams({
          assistantId: assistant.id,
          publicApiKey,
        })}`,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' })

          assert.strictEqual(response.status, 200)
          assert.deepStrictEqual(await response.json(), { source: 'custom' })
        },
      })

      assert.strictEqual(seen.length, 1)
      assert.strictEqual(seen[0].fileId, 'file-assistants')
      assert.ok(seen[0].workspaceWhere)
    })
  })
})
