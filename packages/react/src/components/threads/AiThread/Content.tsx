import {
  // import as useAssistant:
  experimental_useAssistant as useAssistant,
} from 'ai/react'

export const Content = () => {
  const { status, messages, input, submitMessage, handleInputChange } = useAssistant({ api: '/cloud/api/assistant' })
  console.log({ status, messages, input, submitMessage, handleInputChange })

  return (
    <div>
      <h1>Content</h1>
    </div>
  )
}
