import { fireEvent } from '@testing-library/react'

// Types `text` into the message textarea and submits its form.
export const typeMessage = ({
  textarea,
  text,
}: {
  textarea: HTMLElement
  text: string
}) => {
  fireEvent.change(textarea, { target: { value: text } })
  fireEvent.submit(textarea.closest('form')!)
}
