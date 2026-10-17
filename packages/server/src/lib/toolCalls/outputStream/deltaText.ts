import type OpenAI from 'openai'

const CONTENT_SEPARATOR = '\n\n'

// The text a message delta adds; non-text content parts count as empty.
export const deltaText = ({
  delta: { content },
}: {
  delta: OpenAI.Beta.Threads.Messages.MessageDelta
}) =>
  // Message deltas from createMessageResponse always carry content, and their
  // text parts always carry text.
  content!
    .map((part) => {
      if (part.type === 'text') return part.text!.value

      return ''
    })
    .join(CONTENT_SEPARATOR)
