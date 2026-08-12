import { describe, test } from 'node:test'
import { strict as assert } from 'node:assert'
import { serveContainerFileContent } from '../../../src/app/api/files/[fileId]/contents/lib/containerFile'

const makeStubClient = ({
  retrieve,
}: {
  retrieve: (
    fileId: string,
    params: { container_id: string },
  ) => Promise<Response> | never
}) =>
  ({
    containers: {
      files: {
        content: {
          retrieve,
        },
      },
    },
  }) as any

describe('serveContainerFileContent', () => {
  test('passes file_id and container_id separately to OpenAI', async () => {
    let receivedFileId: string | undefined
    let receivedContainerId: string | undefined
    const client = makeStubClient({
      retrieve: async (fileId, params) => {
        receivedFileId = fileId
        receivedContainerId = params.container_id
        return new Response(new Uint8Array([1]))
      },
    })

    await serveContainerFileContent({
      client,
      containerRef: {
        containerId: 'cntr_abc123',
        fileId: 'cfile_xyz789',
      },
    })

    assert.equal(receivedFileId, 'cfile_xyz789')
    assert.equal(receivedContainerId, 'cntr_abc123')
  })

  test('streams bytes through with content-type and content-disposition', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    const upstream = new Response(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="x.png"',
      },
    })
    const client = makeStubClient({ retrieve: async () => upstream })
    const res = await serveContainerFileContent({
      client,
      containerRef: { containerId: 'cntr_q', fileId: 'cfile_z' },
    })

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('Content-Type'), 'image/png')
    assert.equal(
      res.headers.get('Content-Disposition'),
      'attachment; filename="x.png"',
    )
    assert.deepEqual(
      Array.from(new Uint8Array(await res.arrayBuffer())),
      [1, 2, 3, 4, 5],
    )
  })

  test('preserves inline disposition for browser image rendering', async () => {
    const upstream = new Response(new Uint8Array([1]), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'inline; filename="chart.webp"',
      },
    })
    const client = makeStubClient({ retrieve: async () => upstream })
    const res = await serveContainerFileContent({
      client,
      containerRef: { containerId: 'cntr_q', fileId: 'cfile_z' },
    })
    assert.equal(res.headers.get('Content-Type'), 'image/webp')
    assert.equal(
      res.headers.get('Content-Disposition'),
      'inline; filename="chart.webp"',
    )
  })

  test('falls back to octet-stream and inline when upstream omits headers', async () => {
    const client = makeStubClient({
      retrieve: async () => new Response(new Uint8Array([0])),
    })
    const res = await serveContainerFileContent({
      client,
      containerRef: { containerId: 'cntr_q', fileId: 'cfile_z' },
    })
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('Content-Type'), 'application/octet-stream')
    assert.equal(res.headers.get('Content-Disposition'), 'inline')
  })

  for (const upstreamStatus of [404, 410]) {
    test(`returns container_file_unavailable for upstream ${upstreamStatus}`, async () => {
      const client = makeStubClient({
        retrieve: async () => {
          const error = new Error('unavailable') as Error & { status: number }
          error.status = upstreamStatus
          throw error
        },
      })
      const res = await serveContainerFileContent({
        client,
        containerRef: { containerId: 'cntr_expired', fileId: 'cfile_x' },
      })
      assert.equal(res.status, 404)
      assert.deepEqual(await res.json(), {
        error: 'File expired or not found',
        code: 'container_file_unavailable',
      })
    })
  }

  test('returns a generic 500 without leaking unexpected provider errors', async () => {
    const client = makeStubClient({
      retrieve: async () => {
        throw new Error('secret upstream details')
      },
    })
    const res = await serveContainerFileContent({
      client,
      containerRef: { containerId: 'cntr_q', fileId: 'cfile_z' },
    })
    assert.equal(res.status, 500)
    assert.deepEqual(await res.json(), {
      error: 'Failed to fetch container file',
    })
  })
})
