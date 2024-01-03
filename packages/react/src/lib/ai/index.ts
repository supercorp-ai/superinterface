import OpenAI, { ClientOptions } from 'openai'

export const clientOptions: ClientOptions = {
  apiKey: process.env.OPENAI_API_KEY!,
  // @ts-ignore-next-line
  fetch: (url: RequestInfo, init?: RequestInit): Promise<Response> => (
    fetch(url, {
      ...(init || {}),
      // @ts-ignore-next-line
      cache: 'no-store',
    })
  )
}

export const client = new OpenAI(clientOptions)
