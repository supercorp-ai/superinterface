// Reads the response as the tool output: JSON responses are re-serialized,
// anything else is passed through as text.
export const readResponseOutput = async ({
  response,
}: {
  response: Response
}) => {
  const contentType = response.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    return JSON.stringify(await response.json())
  }

  return response.text()
}
