import { useState } from 'react'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import type { UseCreateMessageVariables } from '@/types'

// A button that sends a prepared message, as an app's own UI would, and
// shows how the send ended ("Send result: sent" or the error message).
export const SendPreparedMessage = ({
  variables,
}: {
  variables: UseCreateMessageVariables
}) => {
  const { createMessage } = useCreateMessage()
  const [result, setResult] = useState('')

  return (
    <>
      <button
        type="button"
        onClick={() =>
          createMessage(variables).then(
            () => setResult('sent'),
            (error) => setResult(error.message),
          )
        }
      >
        Send prepared
      </button>
      <output>Send result: {result}</output>
    </>
  )
}
