import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import {
  cachedMessagesVariables,
  renderCachedMessages,
} from '../lib/threads/renderCachedMessages'

const functionCall = ({ name }: { name: string }) => ({
  id: `call_${name}`,
  type: 'function',
  function: { name, arguments: '{}', output: null },
})

const runStep = ({ id, stepDetails }: { id: string; stepDetails: object }) => ({
  id,
  object: 'thread.run.step',
  created_at: 1,
  run_id: 'run_cached',
  assistant_id: cachedMessagesVariables.assistantId,
  thread_id: 'thread_cached',
  type: 'tool_calls',
  status: 'in_progress',
  step_details: stepDetails,
  completed_at: null,
  cancelled_at: null,
  failed_at: null,
  expired_at: null,
  last_error: null,
  usage: null,
  metadata: {},
})

const toolCallsStep = ({
  id,
  toolCalls,
}: {
  id: string
  toolCalls: object[]
}) =>
  runStep({ id, stepDetails: { type: 'tool_calls', tool_calls: toolCalls } })

const messageCreationStep = ({ messageId }: { messageId: string }) =>
  runStep({
    id: `step_${messageId}`,
    stepDetails: {
      type: 'message_creation',
      message_creation: { message_id: messageId },
    },
  })

const assistantMessage = ({
  id,
  text,
  runSteps,
}: {
  id: string
  text: string
  runSteps: object[]
}) => ({
  id,
  object: 'thread.message',
  created_at: 1,
  thread_id: 'thread_cached',
  role: 'assistant',
  content: [{ type: 'text', text: { value: text, annotations: [] } }],
  run_id: 'run_cached',
  assistant_id: cachedMessagesVariables.assistantId,
  attachments: [],
  metadata: {},
  status: 'completed',
  runSteps,
})

// A rendered message's three parts: its older run steps, its content, and
// its later run steps.
const messageParts = ({ text }: { text: string }) => {
  const messageBox = screen
    .getByText(text)
    .closest('[style*="word-break"]')!.parentElement!

  return Array.from(messageBox.children).map((part) => part.textContent)
}

describe('RunStep.ToolCalls in cached messages', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows starting actions for a tool calls step with no tool calls yet', () => {
    renderCachedMessages({
      messages: [
        assistantMessage({
          id: 'msg_working',
          text: 'Working on it.',
          runSteps: [
            toolCallsStep({ id: 'step_starting', toolCalls: [] }),
            toolCallsStep({
              id: 'step_lookup',
              toolCalls: [functionCall({ name: 'lookup' })],
            }),
          ],
        }),
      ],
    })

    expect(screen.getAllByText('Starting actions')).toHaveLength(1)
    expect(screen.getAllByText('Calling lookup')).toHaveLength(1)
    expect(messageParts({ text: 'Working on it.' })).toEqual([
      '',
      'Working on it.',
      // Newest step first in the DOM, inside a column-reverse list.
      'Starting actionsCalling lookup',
    ])
  })

  it('splits a run step list between the messages each step came after', () => {
    // Newest first: `first` was written after the `oldest` call, then the
    // `middle` call ran, then `second` was written.
    const runSteps = [
      messageCreationStep({ messageId: 'msg_second' }),
      toolCallsStep({
        id: 'step_middle',
        toolCalls: [functionCall({ name: 'middle' })],
      }),
      messageCreationStep({ messageId: 'msg_first' }),
      toolCallsStep({
        id: 'step_oldest',
        toolCalls: [functionCall({ name: 'oldest' })],
      }),
    ]
    renderCachedMessages({
      messages: [
        assistantMessage({ id: 'msg_second', text: 'Second.', runSteps }),
        assistantMessage({ id: 'msg_first', text: 'First.', runSteps }),
      ],
    })

    expect(messageParts({ text: 'First.' })).toEqual([
      'Calling oldest',
      'First.',
      'Calling middle',
    ])
    expect(messageParts({ text: 'Second.' })).toEqual(['', 'Second.', ''])
    expect(screen.getAllByText('Calling middle')).toHaveLength(1)
    expect(screen.getAllByText('Calling oldest')).toHaveLength(1)
  })

  it('shows the run steps from the newest one below a message when no next message creation step follows it', () => {
    renderCachedMessages({
      messages: [
        assistantMessage({
          id: 'msg_only',
          text: 'Only message.',
          // Newest first: the message was written, then two calls ran.
          runSteps: [
            toolCallsStep({
              id: 'step_latest',
              toolCalls: [functionCall({ name: 'latest' })],
            }),
            toolCallsStep({
              id: 'step_earlier',
              toolCalls: [functionCall({ name: 'earlier' })],
            }),
            messageCreationStep({ messageId: 'msg_only' }),
          ],
        }),
      ],
    })

    expect(messageParts({ text: 'Only message.' })).toEqual([
      '',
      'Only message.',
      'Calling latestCalling earlier',
    ])
  })

  it('BUG: shows a call twice when two tool call steps lie between two messages', () => {
    // Newest first: `first` was written, the `y` and then the `x` call ran,
    // and then `second` was written.
    const runSteps = [
      messageCreationStep({ messageId: 'msg_second' }),
      toolCallsStep({ id: 'step_x', toolCalls: [functionCall({ name: 'x' })] }),
      toolCallsStep({ id: 'step_y', toolCalls: [functionCall({ name: 'y' })] }),
      messageCreationStep({ messageId: 'msg_first' }),
    ]
    renderCachedMessages({
      messages: [
        assistantMessage({ id: 'msg_second', text: 'Second.', runSteps }),
        assistantMessage({ id: 'msg_first', text: 'First.', runSteps }),
      ],
    })

    // Both calls show below `first`, and `second` repeats `x` above itself:
    // its older steps end one step short of `first`'s message creation step
    // instead of right before it.
    expect(messageParts({ text: 'First.' })).toEqual([
      '',
      'First.',
      'Calling xCalling y',
    ])
    expect(messageParts({ text: 'Second.' })).toEqual([
      'Calling x',
      'Second.',
      '',
    ])
    expect(screen.getAllByText('Calling x')).toHaveLength(2)
  })
})
