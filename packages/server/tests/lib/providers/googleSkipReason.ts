// Integration tests against the real Gemini API need a key with credit.
// Sends the smallest possible request to `model`, and returns why the tests
// can't run (missing key, rejected key, no credit), or undefined if they can.
export const googleSkipReason = async ({ model }: { model: string }) => {
  const apiKey = process.env.TEST_GOOGLE_API_KEY
  if (!apiKey) return 'TEST_GOOGLE_API_KEY is not configured'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    },
  )
  if (response.ok) return undefined

  const body = await response.text()
  return `Gemini API is not usable (${response.status}): ${body.slice(0, 200)}`
}
