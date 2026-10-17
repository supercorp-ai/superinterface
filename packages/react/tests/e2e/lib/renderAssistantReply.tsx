import { screen } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { createTestAssistant } from './createTestAssistant'
import { renderWithSuperinterface } from './renderWithSuperinterface'
import { submitThreadMessage } from './submitThreadMessage'

// Renders a Thread for a new assistant backed by `llmBaseUrl`, sends `prompt`
// and waits until the reply streamed in, identified by `waitForText`.
export const renderAssistantReply = async ({
  llmBaseUrl,
  prompt = 'Hi',
  waitForText,
  wrap = (children) => children,
  children = <Thread />,
}: {
  llmBaseUrl: string
  prompt?: string
  waitForText: string | RegExp
  wrap?: (children: React.ReactNode) => React.ReactNode
  children?: React.ReactNode
}) => {
  const created = await createTestAssistant({ llmBaseUrl })

  const rendered = renderWithSuperinterface({
    variables: {
      publicApiKey: created.publicKey,
      assistantId: created.assistant.id,
    },
    children: wrap(children),
  })

  await submitThreadMessage({ content: prompt })
  await screen.findByText(waitForText, {}, { timeout: 15_000 })

  return { ...created, ...rendered }
}
