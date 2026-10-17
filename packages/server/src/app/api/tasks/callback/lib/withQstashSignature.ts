import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'

const isSignatureCheckDisabled = () => {
  if (process.env.NODE_ENV === 'test') return true

  return !process.env.QSTASH_CURRENT_SIGNING_KEY
}

// Only accepts QStash-signed requests once a signing key is configured
// outside tests.
export const withQstashSignature = <
  Handler extends (request: Request) => Promise<Response>,
>({
  handler,
}: {
  handler: Handler
}) => {
  if (isSignatureCheckDisabled()) return handler

  return verifySignatureAppRouter(handler)
}
