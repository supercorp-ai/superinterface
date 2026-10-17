import type { MessageEvent } from './readMessageEvents'

const jsonEnd = ({ text }: { text: string }) => {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }

    if (char === '"') inString = true
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return i + 1
    }
  }

  return -1
}

// Like readMessageEvents, but yields each back-to-back JSON event as soon as
// it arrives so tests can react mid-run (e.g. submit client tool outputs).
export async function* streamMessageEvents({
  response,
}: {
  response: Response
}): AsyncGenerator<MessageEvent> {
  const decoder = new TextDecoder()
  let buffer = ''

  const reader = response.body!.getReader()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    while (true) {
      buffer = buffer.trimStart()
      const end = jsonEnd({ text: buffer })
      if (end === -1) break
      yield JSON.parse(buffer.slice(0, end))
      buffer = buffer.slice(end)
    }
  }
}
