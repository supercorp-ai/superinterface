import { screen } from '@testing-library/react'

// Waits for the message form's textarea, which shows once the assistant
// (and so its name in the placeholder) has loaded from the server.
export const findMessageInput = ({
  placeholder = 'Message E2E Assistant...',
}: {
  placeholder?: string
} = {}) => screen.findByPlaceholderText(placeholder, {}, { timeout: 15_000 })
