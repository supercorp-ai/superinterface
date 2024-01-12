import OpenAI from 'openai'

export const defaultClient = new OpenAI({
  apiKey: '123' || process.env.OPENAI_API_KEY!,
})
