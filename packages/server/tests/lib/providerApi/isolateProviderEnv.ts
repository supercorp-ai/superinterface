// Environment variables provider SDKs read for base URLs and fallback keys.
const providerEnvKeys = [
  'OPENAI_BASE_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_BASE_URL',
  'GROQ_BASE_URL',
  'GROQ_API_KEY',
  'COMMUNITY_TEST_GROQ_API_KEY',
  'GOOGLE_GEMINI_BASE_URL',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_AUTHORITY_HOST',
]

// Clears provider SDK environment variables, applies `env` on top and
// returns a function that restores the original values.
export const isolateProviderEnv = ({
  env = {},
}: {
  env?: Record<string, string>
} = {}) => {
  const original = Object.fromEntries(
    providerEnvKeys.map((key) => [key, process.env[key]]),
  )

  for (const key of providerEnvKeys) delete process.env[key]
  Object.assign(process.env, env)

  return () => {
    for (const key of providerEnvKeys) {
      const value = original[key]
      if (value === undefined) {
        delete process.env[key]
        continue
      }
      process.env[key] = value
    }
  }
}
