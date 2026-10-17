import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import {
  cachedMessagesVariables,
  renderCachedMessages,
} from '../lib/threads/renderCachedMessages'

const userMessage = ({ id, status }: { id: string; status?: string }) => ({
  id,
  object: 'thread.message',
  created_at: 1,
  thread_id: 'thread_progress',
  role: 'user',
  content: [{ type: 'text', text: { value: 'Hello', annotations: [] } }],
  run_id: null,
  assistant_id: null,
  attachments: [],
  metadata: {},
  runSteps: [],
  ...(status ? { status } : {}),
})

const assistantMessage = {
  ...userMessage({ id: 'msg_reply', status: 'in_progress' }),
  role: 'assistant',
  content: [],
  run_id: 'run_progress',
  assistant_id: cachedMessagesVariables.assistantId,
}

const renderMessages = ({
  messages,
  isMutatingMessage,
}: {
  messages: object[]
  isMutatingMessage: boolean
}) => {
  const { container } = renderCachedMessages({ messages, isMutatingMessage })
  const list = container.querySelector('.rt-r-fd-column-reverse')!

  // Under the top spacer comes the progress indicator, if any, then the
  // message groups: each its sender's name ('You' for the user) and messages.
  return {
    text: list.textContent,
    progress: list.children[1],
    skeletons: list.querySelectorAll<HTMLElement>('.rt-Skeleton'),
  }
}

// The starting skeleton: the assistant's avatar and name over a skeleton.
const expectStarting = ({
  progress,
  skeletons,
}: ReturnType<typeof renderMessages>) => {
  expect(progress.textContent).toBe('Assistant')
  expect(progress.querySelector('.rt-AvatarRoot')).not.toBeNull()
  expect(skeletons).toHaveLength(1)
  expect(skeletons[0].style.borderRadius).toBe('var(--radius-6)')
}

// The typing skeleton: an empty avatar slot and a skeleton, without a name.
const expectTyping = ({
  progress,
  skeletons,
}: ReturnType<typeof renderMessages>) => {
  expect(progress.textContent).toBe('')
  expect(progress.querySelector('.rt-AvatarRoot')).toBeNull()
  expect(skeletons).toHaveLength(1)
  expect(progress.contains(skeletons[0])).toBe(true)
}

describe('Thread.Messages progress', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the assistant starting while an optimistic latest user message is mutating', () => {
    const rendered = renderMessages({
      messages: [userMessage({ id: '-optimistic' })],
      isMutatingMessage: true,
    })

    expectStarting(rendered)
    expect(rendered.text).toBe('AssistantYouHello')
  })

  it('shows nothing for an optimistic latest message when no message is mutating', () => {
    const { text, progress, skeletons } = renderMessages({
      messages: [userMessage({ id: '-optimistic' })],
      isMutatingMessage: false,
    })

    expect(skeletons).toHaveLength(0)
    expect(progress.textContent).toBe('YouHello')
    expect(text).toBe('YouHello')
  })

  it('shows a typing skeleton once the latest user message is saved, not optimistic', () => {
    const rendered = renderMessages({
      messages: [userMessage({ id: 'msg_saved', status: 'completed' })],
      isMutatingMessage: true,
    })

    expectTyping(rendered)
    expect(rendered.text).toBe('YouHello')
  })

  it('shows a typing skeleton while the latest user message is in progress', () => {
    const rendered = renderMessages({
      messages: [userMessage({ id: '-optimistic', status: 'in_progress' })],
      isMutatingMessage: true,
    })

    expectTyping(rendered)
    expect(rendered.text).toBe('YouHello')
  })

  it('shows a typing skeleton under a latest assistant message while mutating', () => {
    const rendered = renderMessages({
      messages: [assistantMessage, userMessage({ id: 'msg_saved' })],
      isMutatingMessage: true,
    })

    expectTyping(rendered)
    // The assistant's group is named after the assistant, the user's 'You'.
    expect(rendered.text).toBe('AssistantYouHello')
  })

  it('shows a typing skeleton while mutating without any latest message', () => {
    const rendered = renderMessages({ messages: [], isMutatingMessage: true })

    expectTyping(rendered)
    expect(rendered.text).toBe('')
  })

  it('shows nothing without messages when no message is mutating', () => {
    const { progress, skeletons } = renderMessages({
      messages: [],
      isMutatingMessage: false,
    })

    expect(skeletons).toHaveLength(0)
    expect(progress.textContent).toBe('')
    expect(progress.querySelector('.rt-Skeleton')).toBeNull()
  })
})
