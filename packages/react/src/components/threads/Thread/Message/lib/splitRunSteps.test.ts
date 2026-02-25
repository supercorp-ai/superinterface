import { describe, expect, test } from 'vitest'
import type { SerializedRunStep } from '@/types'
import { splitRunSteps } from './splitRunSteps'

// Helper to create a message_creation run step
const mc = (id: string, messageId: string): SerializedRunStep =>
  ({
    id,
    run_id: 'run-1',
    status: 'completed' as const,
    completed_at: 1,
    cancelled_at: null,
    failed_at: null,
    step_details: {
      type: 'message_creation' as const,
      message_creation: { message_id: messageId },
    },
  }) as SerializedRunStep

// Helper to create a tool_calls run step
const tc = (id: string): SerializedRunStep =>
  ({
    id,
    run_id: 'run-1',
    status: 'completed' as const,
    completed_at: 1,
    cancelled_at: null,
    failed_at: null,
    step_details: {
      type: 'tool_calls' as const,
      tool_calls: [
        {
          type: 'function',
          id: 'call-1',
          function: { name: 'test', arguments: '{}', output: null },
        },
      ],
    },
  }) as SerializedRunStep

describe('splitRunSteps', () => {
  test('empty runSteps returns two empty arrays', () => {
    const [older, later] = splitRunSteps({
      messageId: 'msg-1',
      runSteps: [],
    })
    expect(older).toEqual([])
    expect(later).toEqual([])
  })

  test('message with no matching creation step returns all as laterRunSteps', () => {
    const runSteps = [mc('rs-1', 'msg-other'), tc('rs-2')]
    const [older, later] = splitRunSteps({
      messageId: 'msg-1',
      runSteps,
    })
    expect(older).toEqual([])
    expect(later).toEqual(runSteps)
  })

  test('single message with no tool calls', () => {
    const runSteps = [mc('rs-1', 'msg-1')]
    const [older, later] = splitRunSteps({
      messageId: 'msg-1',
      runSteps,
    })
    expect(older).toHaveLength(0)
    expect(later).toHaveLength(0)
  })

  // Scenario: Two messages with tool calls between them
  // RunSteps (newest first): [mc->msg-A, tc-1, mc->msg-B, tc-2]
  describe('two messages with interleaved tool calls', () => {
    const runSteps = [
      mc('rs-0', 'msg-A'), // index 0: newest message creation
      tc('rs-1'), // index 1: tool call between A and B
      mc('rs-2', 'msg-B'), // index 2: older message creation
      tc('rs-3'), // index 3: tool call before B
    ]

    test('newest message (msg-A) gets tool call after it as olderRunSteps', () => {
      const [older, later] = splitRunSteps({
        messageId: 'msg-A',
        runSteps,
      })
      // olderRunSteps: steps between this creation (index 0) and next creation (index 2)
      // = slice(1, 1+1) = [tc at index 1]
      expect(older).toHaveLength(1)
      expect(older[0].id).toBe('rs-1')
      // laterRunSteps: nothing before index 0
      expect(later).toHaveLength(0)
    })

    test('older message (msg-B) gets tool call after it as olderRunSteps', () => {
      const [older, later] = splitRunSteps({
        messageId: 'msg-B',
        runSteps,
      })
      // olderRunSteps: steps after index 2 with no further message_creation
      // = slice(3) = [tc at index 3]
      expect(older).toHaveLength(1)
      expect(older[0].id).toBe('rs-3')
      // laterRunSteps: steps from previous message_creation (index 0) to index 2
      // = slice(0, 2) = [mc->msg-A, tc]
      expect(later).toHaveLength(2)
      expect(later[0].id).toBe('rs-0')
      expect(later[1].id).toBe('rs-1')
    })
  })

  // Scenario matching the real API data:
  // 10 messages, alternating message_creation and tool_calls
  // All 20 messages share the same 20 runSteps
  describe('real-world: 10 message_creation + 10 tool_calls alternating', () => {
    const messageIds = Array.from({ length: 10 }, (_, i) => `msg-${i}`)
    // RunSteps: [mc->0, tc, mc->1, tc, mc->2, tc, ..., mc->9, tc]
    const runSteps: SerializedRunStep[] = []
    for (let i = 0; i < 10; i++) {
      runSteps.push(mc(`rs-mc-${i}`, messageIds[i]))
      runSteps.push(tc(`rs-tc-${i}`))
    }

    test('total runSteps is 20', () => {
      expect(runSteps).toHaveLength(20)
    })

    test('first message (msg-0) gets 1 olderRunStep and 0 laterRunSteps', () => {
      const [older, later] = splitRunSteps({
        messageId: 'msg-0',
        runSteps,
      })
      expect(older).toHaveLength(1)
      expect(older[0].id).toBe('rs-tc-0')
      expect(later).toHaveLength(0)
    })

    test('second message (msg-1) gets 1 olderRunStep and 2 laterRunSteps', () => {
      const [older, later] = splitRunSteps({
        messageId: 'msg-1',
        runSteps,
      })
      expect(older).toHaveLength(1)
      expect(older[0].id).toBe('rs-tc-1')
      expect(later).toHaveLength(2)
      expect(later[0].id).toBe('rs-mc-0')
      expect(later[1].id).toBe('rs-tc-0')
    })

    test('middle message (msg-5) gets 1 olderRunStep and 2 laterRunSteps', () => {
      const [older, later] = splitRunSteps({
        messageId: 'msg-5',
        runSteps,
      })
      expect(older).toHaveLength(1)
      expect(older[0].id).toBe('rs-tc-5')
      expect(later).toHaveLength(2)
      expect(later[0].id).toBe('rs-mc-4')
      expect(later[1].id).toBe('rs-tc-4')
    })

    test('last message (msg-9) gets 1 olderRunStep and 2 laterRunSteps', () => {
      const [older, later] = splitRunSteps({
        messageId: 'msg-9',
        runSteps,
      })
      expect(older).toHaveLength(1)
      expect(older[0].id).toBe('rs-tc-9')
      expect(later).toHaveLength(2)
      expect(later[0].id).toBe('rs-mc-8')
      expect(later[1].id).toBe('rs-tc-8')
    })

    test('each message gets exactly 1 olderRunStep (the tool call after it)', () => {
      for (let i = 0; i < 10; i++) {
        const [older] = splitRunSteps({
          messageId: `msg-${i}`,
          runSteps,
        })
        expect(older).toHaveLength(1)
        expect(older[0].id).toBe(`rs-tc-${i}`)
        expect(older[0].step_details.type).toBe('tool_calls')
      }
    })

    // Messages without a matching creation step (messages 10-19 in the real data)
    test('message with no matching creation step gets all runSteps as laterRunSteps', () => {
      const [older, later] = splitRunSteps({
        messageId: 'msg-nonexistent',
        runSteps,
      })
      expect(older).toHaveLength(0)
      expect(later).toHaveLength(20)
    })
  })

  describe('edge cases', () => {
    test('message creation at the very end of runSteps with no following steps', () => {
      const runSteps = [tc('rs-0'), mc('rs-1', 'msg-1')]
      const [older, later] = splitRunSteps({
        messageId: 'msg-1',
        runSteps,
      })
      expect(older).toHaveLength(0)
      expect(later).toHaveLength(1)
      expect(later[0].id).toBe('rs-0')
    })

    test('consecutive message creations with no tool calls between', () => {
      const runSteps = [
        mc('rs-0', 'msg-A'),
        mc('rs-1', 'msg-B'),
        mc('rs-2', 'msg-C'),
      ]

      const [olderA, laterA] = splitRunSteps({
        messageId: 'msg-A',
        runSteps,
      })
      expect(olderA).toHaveLength(0) // next mc is immediately at index 1
      expect(laterA).toHaveLength(0) // nothing before index 0

      const [olderB, laterB] = splitRunSteps({
        messageId: 'msg-B',
        runSteps,
      })
      expect(olderB).toHaveLength(0) // next mc is immediately at index 2
      expect(laterB).toHaveLength(1) // [mc->msg-A] from index 0 to 1
      expect(laterB[0].id).toBe('rs-0')

      const [olderC, laterC] = splitRunSteps({
        messageId: 'msg-C',
        runSteps,
      })
      expect(olderC).toHaveLength(0) // nothing after index 2
      expect(laterC).toHaveLength(1) // [mc->msg-B] from index 1 to 2
      expect(laterC[0].id).toBe('rs-1')
    })

    test('multiple tool calls between two messages', () => {
      const runSteps = [
        mc('rs-0', 'msg-A'),
        tc('rs-1'),
        tc('rs-2'),
        tc('rs-3'),
        mc('rs-4', 'msg-B'),
      ]

      const [olderA, laterA] = splitRunSteps({
        messageId: 'msg-A',
        runSteps,
      })
      // 3 tool calls between msg-A (index 0) and msg-B (index 4)
      expect(olderA).toHaveLength(3)
      expect(olderA.map((s) => s.id)).toEqual(['rs-1', 'rs-2', 'rs-3'])
      expect(laterA).toHaveLength(0)

      const [olderB, laterB] = splitRunSteps({
        messageId: 'msg-B',
        runSteps,
      })
      expect(olderB).toHaveLength(0) // nothing after index 4
      // laterRunSteps: from previous mc (index 0) to index 4
      expect(laterB).toHaveLength(4)
      expect(laterB.map((s) => s.id)).toEqual(['rs-0', 'rs-1', 'rs-2', 'rs-3'])
    })

    test('only tool calls, no message creations', () => {
      const runSteps = [tc('rs-0'), tc('rs-1'), tc('rs-2')]
      const [older, later] = splitRunSteps({
        messageId: 'msg-1',
        runSteps,
      })
      expect(older).toHaveLength(0)
      expect(later).toEqual(runSteps)
    })

    test('single message creation only', () => {
      const runSteps = [mc('rs-0', 'msg-1')]
      const [older, later] = splitRunSteps({
        messageId: 'msg-1',
        runSteps,
      })
      expect(older).toHaveLength(0)
      expect(later).toHaveLength(0)
    })

    test('tool calls before first message creation go to laterRunSteps', () => {
      // RunSteps: [tc, tc, mc->msg-A]
      const runSteps = [tc('rs-0'), tc('rs-1'), mc('rs-2', 'msg-A')]
      const [older, later] = splitRunSteps({
        messageId: 'msg-A',
        runSteps,
      })
      expect(older).toHaveLength(0)
      // laterRunSteps: from 0 to 2 (no previous mc found, nextRunStepIndex defaults to 0)
      expect(later).toHaveLength(2)
      expect(later.map((s) => s.id)).toEqual(['rs-0', 'rs-1'])
    })
  })
})
