import OpenAI from 'openai'

export const defaultClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})
