// Integration tests against the real OpenRouter API need a valid key. Returns
// why they can't run (missing or rejected key), or undefined if they can.
export const openRouterSkipReason = async () => {
  const apiKey = process.env.TEST_OPENROUTER_API_KEY
  if (!apiKey) return 'TEST_OPENROUTER_API_KEY is not configured'

  const response = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (response.ok) return undefined

  return `OpenRouter API key is not usable (${response.status})`
}
