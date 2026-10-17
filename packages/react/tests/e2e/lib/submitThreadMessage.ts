import { expect } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'

// Types `content` into the thread's message field and submits the form. The
// form ignores submissions while the previous message is still being sent
// (and is only disabled while the latest message blocks), so this submits
// again until the form takes the message and clears the field.
export const submitThreadMessage = async ({
  content,
  placeholder = 'Message E2E Assistant...',
}: {
  content: string
  placeholder?: string
}) => {
  const textarea = (await screen.findByPlaceholderText(
    placeholder,
    {},
    { timeout: 15_000 },
  )) as HTMLTextAreaElement

  await waitFor(() => expect(textarea.disabled).toBe(false), {
    timeout: 15_000,
  })

  const deadline = Date.now() + 15_000

  while (true) {
    fireEvent.change(textarea, { target: { value: content } })
    fireEvent.submit(textarea.closest('form')!)

    try {
      await waitFor(() => expect(textarea.value).toBe(''), { timeout: 500 })
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
    }
  }
}
