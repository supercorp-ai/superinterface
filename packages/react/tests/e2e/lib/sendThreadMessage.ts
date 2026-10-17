import { fireEvent, screen } from '@testing-library/react'

// Types a message into the rendered Thread's form and submits it.
export const sendThreadMessage = async ({
  content,
  placeholder = 'Message E2E Assistant...',
}: {
  content: string
  placeholder?: string
}) => {
  const textarea = await screen.findByPlaceholderText(
    placeholder,
    {},
    { timeout: 15_000 },
  )
  fireEvent.change(textarea, { target: { value: content } })
  fireEvent.submit(textarea.closest('form')!)
}
