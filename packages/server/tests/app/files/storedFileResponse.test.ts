/* eslint-disable @typescript-eslint/no-explicit-any -- the helper is called with partial client fakes */
import { describe, test } from 'node:test'
import { strict as assert } from 'node:assert'
import { NextResponse } from 'next/server'

// Imported inside each test, so the first test is the one that loads it.
const loadStoredFileResponse = async () =>
  (
    await import(
      '../../../src/app/api/files/[fileId]/contents/lib/storedFileResponse'
    )
  ).storedFileResponse

const workspaceAccessWhere = { apiKeys: { some: { id: 'api_key_1' } } }

const unusedPurposeAssistantsResponse = () => {
  throw new Error('purposeAssistantsResponse must not be used')
}

describe('storedFileResponse', () => {
  test('serves the stored file contents with their upstream headers', async () => {
    const contentCalls: string[] = []
    const client = {
      files: {
        retrieve: async () => ({ id: 'file_1', purpose: 'user_data' }),
        content: async (fileId: string) => {
          contentCalls.push(fileId)
          return new Response('stored-bytes', {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="data.csv"',
            },
          })
        },
      },
    } as any

    const storedFileResponse = await loadStoredFileResponse()
    const response = await storedFileResponse({
      assistantClient: client,
      fileId: 'file_1',
      workspaceAccessWhere,
      purposeAssistantsResponse: unusedPurposeAssistantsResponse,
    })

    assert.equal(response.status, 200)
    assert.equal(await response.text(), 'stored-bytes')
    assert.equal(response.headers.get('Content-Type'), 'text/csv')
    assert.equal(
      response.headers.get('Content-Disposition'),
      'attachment; filename="data.csv"',
    )
    assert.deepEqual(contentCalls, ['file_1'])
  })

  test('answers 404 when the storage provider has no such file', async () => {
    const client = {
      files: {
        retrieve: async () => null,
        content: async () => {
          throw new Error('contents must not be fetched')
        },
      },
    } as any

    const storedFileResponse = await loadStoredFileResponse()
    const response = await storedFileResponse({
      assistantClient: client,
      fileId: 'file_missing',
      workspaceAccessWhere,
      purposeAssistantsResponse: unusedPurposeAssistantsResponse,
    })

    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { error: 'No file found' })
  })

  test('leaves assistants-purpose files to purposeAssistantsResponse', async () => {
    const file = { id: 'file_assistants', purpose: 'assistants' }
    const seen: unknown[] = []
    const client = {
      files: {
        retrieve: async () => file,
        content: async () => {
          throw new Error('contents must not be fetched')
        },
      },
    } as any

    const storedFileResponse = await loadStoredFileResponse()
    const response = await storedFileResponse({
      assistantClient: client,
      fileId: 'file_assistants',
      workspaceAccessWhere,
      purposeAssistantsResponse: (args) => {
        seen.push(args)
        return NextResponse.json({ source: 'custom' })
      },
    })

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { source: 'custom' })
    assert.deepEqual(seen, [{ file, workspaceAccessWhere }])
  })
})
