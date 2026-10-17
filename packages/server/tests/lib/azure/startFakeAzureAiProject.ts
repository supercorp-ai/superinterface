import { createServer } from 'node:https'
import type { AddressInfo } from 'node:net'
import { createSelfSignedCertificate } from '../http/createSelfSignedCertificate'

export type FakeAzureRequest = {
  method: string
  path: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
}

export type FakeAzureResponse = {
  status: number
  json: unknown
}

const parseBody = ({ raw }: { raw: string }) => {
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return Object.fromEntries(new URLSearchParams(raw))
  }
}

// A local HTTPS stand-in for both Azure AD (as an ADFS authority, which MSAL
// trusts without instance discovery against login.microsoftonline.com) and an
// Azure AI Foundry project endpoint. Point the credential at it with
// AZURE_AUTHORITY_HOST=<origin>, tenant id `adfs`, and set the model
// provider endpoint to `<origin>/api/projects/test`. Project requests are
// answered by `handle`.
export const startFakeAzureAiProject = async ({
  handle,
}: {
  handle: (request: FakeAzureRequest) => FakeAzureResponse
}) => {
  const requests: FakeAzureRequest[] = []
  let origin = ''

  const server = createServer(
    createSelfSignedCertificate(),
    async (req, res) => {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      const request = {
        method: req.method ?? 'GET',
        path: new URL(req.url ?? '/', 'https://localhost').pathname,
        body: parseBody({ raw: Buffer.concat(chunks).toString('utf8') }),
      }
      requests.push(request)

      const send = ({ status, json }: FakeAzureResponse) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(json))
      }

      if (request.path === '/adfs/.well-known/openid-configuration') {
        send({
          status: 200,
          json: {
            issuer: `${origin}/adfs`,
            authorization_endpoint: `${origin}/adfs/oauth2/authorize`,
            token_endpoint: `${origin}/adfs/oauth2/token`,
            jwks_uri: `${origin}/adfs/discovery/keys`,
          },
        })
        return
      }

      if (request.path === '/adfs/oauth2/token') {
        send({
          status: 200,
          json: {
            token_type: 'Bearer',
            access_token: 'fake-azure-token',
            expires_in: 3600,
          },
        })
        return
      }

      send(handle(request))
    },
  )

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  origin = `https://127.0.0.1:${port}`

  return {
    origin,
    endpoint: `${origin}/api/projects/test`,
    requests,
    projectRequests: () =>
      requests.filter(({ path }) => path.startsWith('/api/projects/test')),
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
