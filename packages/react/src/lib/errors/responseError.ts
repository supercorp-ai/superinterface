// The error for a failed request: the server's message when it answered with
// a JSON `{ error }`, otherwise `defaultMessage`.
export const responseError = async ({
  response,
  defaultMessage,
}: {
  response: Response
  defaultMessage: string
}) => {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown
  } | null

  if (typeof body?.error === 'string') return new Error(body.error)

  return new Error(defaultMessage)
}
