import type { ProxiedRequest } from './startHeldProxy'

const formField = ({ body, name }: { body: string; name: string }) =>
  body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`))?.[1]

// Answers POST /api/files the way the server does once its storage
// provider has stored the upload. The e2e server's storage can't store files
// without a real OpenAI account, so tests that need a successful upload put
// this behind `startHeldProxy().respond`. The file id is `file-<filename>`.
export const fakeFileUpload = ({ request }: { request: ProxiedRequest }) => {
  const body = request.body.toString('latin1')
  const filename = body.match(/name="file"; filename="([^"]+)"/)?.[1]

  return {
    status: 200,
    json: {
      file: {
        id: `file-${filename}`,
        object: 'file',
        filename,
        bytes: request.body.length,
        purpose: formField({ body, name: 'purpose' }),
        created_at: Math.floor(Date.now() / 1000),
        status: 'processed',
      },
    },
  }
}
