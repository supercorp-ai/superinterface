import { createHash, createHmac, randomUUID } from 'node:crypto'

const base64url = (value: string | Buffer) =>
  Buffer.from(value).toString('base64url')

// Builds an `Upstash-Signature` JWT the way QStash signs deliveries: HS256
// with the signing key, issuer "Upstash" and a SHA-256 hash of the body.
export const signQstashRequest = ({
  body,
  signingKey,
  url = 'https://superinterface.test/api/cloud/tasks/callback',
}: {
  body: string
  signingKey: string
  url?: string
}) => {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      iss: 'Upstash',
      sub: url,
      iat: now,
      nbf: now,
      exp: now + 300,
      jti: randomUUID(),
      body: createHash('sha256').update(body).digest('base64url'),
    }),
  )
  const signature = createHmac('sha256', signingKey)
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${signature}`
}
