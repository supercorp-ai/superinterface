import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type OpenAI from 'openai'
import { Thread } from '@/components/threads/Thread'
import { ComponentsProvider } from '@/components/components/ComponentsProvider'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { useComponents } from '@/hooks/components/useComponents'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { renderAssistantReply } from '../lib/renderAssistantReply'

// Wraps the default text content in an article, the way an app customizes a
// single component and keeps the rest.
const ArticleTextContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => (
  <article aria-label="reply">
    <DefaultTextContent content={content} />
  </article>
)

const DefaultTextContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  const {
    components: { MessageAttachments },
  } = useComponents()

  // MessageAttachments still comes from the defaults, merged in.
  return (
    <span data-has-attachments={String(Boolean(MessageAttachments))}>
      {content.text.value}
    </span>
  )
}

describe('ComponentsProvider', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('replaces some components and keeps the others', async () => {
    fakeLlm = await startFakeLlm({ replies: [{ content: 'Customized.' }] })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Customized.',
      wrap: (children) => (
        <ComponentsProvider components={{ StartingSkeleton: () => null }}>
          <ComponentsProvider components={{ TextContent: ArticleTextContent }}>
            {children}
          </ComponentsProvider>
        </ComponentsProvider>
      ),
      children: <Thread />,
    })

    const replies = screen.getAllByRole('article', { name: 'reply' })
    expect(replies.map((reply) => reply.textContent)).toEqual([
      'Customized.',
      'Hi',
    ])
    expect(
      replies[0].firstElementChild!.getAttribute('data-has-attachments'),
    ).toBe('true')
  }, 30_000)
})

describe('nested SuperinterfaceProviders', () => {
  afterEach(() => {
    cleanup()
  })

  it('replace array variables instead of merging them', () => {
    const Variables = () => (
      <pre data-testid="variables">
        {JSON.stringify(useSuperinterfaceContext().variables)}
      </pre>
    )

    render(
      <SuperinterfaceProvider
        baseUrl="https://app.example.com/api"
        variables={{ assistantId: 'a', tags: ['outer', 'extra'] }}
      >
        <SuperinterfaceProvider variables={{ tags: ['inner'] }}>
          <Variables />
        </SuperinterfaceProvider>
      </SuperinterfaceProvider>,
    )

    expect(JSON.parse(screen.getByTestId('variables').textContent!)).toEqual({
      assistantId: 'a',
      tags: ['inner'],
    })
  })
})
