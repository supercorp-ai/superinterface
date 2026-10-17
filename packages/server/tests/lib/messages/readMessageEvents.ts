export type MessageEvent = {
  event: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

const nextJsonEnd = ({ text, start }: { text: string; start: number }) => {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
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

  throw new Error(`Unterminated JSON in stream: ${text.slice(start)}`)
}

// The messages route streams events as back-to-back JSON objects.
export const readMessageEvents = async ({
  response,
}: {
  response: Response
}) => {
  const text = await response.text()
  const events: MessageEvent[] = []
  let index = 0

  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1
      continue
    }

    const end = nextJsonEnd({ text, start: index })
    events.push(JSON.parse(text.slice(index, end)))
    index = end
  }

  return events
}
