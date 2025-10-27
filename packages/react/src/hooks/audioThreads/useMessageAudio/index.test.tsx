import { act, render, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { vi, describe, beforeEach, afterEach, expect, test } from 'vitest'
import type { SerializedMessage } from '@/types'

const mockMessages = vi.hoisted(() => [] as SerializedMessage[])

const useMessagesMock = vi.hoisted(() =>
  vi.fn(() => ({
    messages: [...mockMessages],
  })),
)

let superinterfaceContextValue = {
  baseUrl: 'https://example.com',
  variables: { voice: 'nova' },
}

vi.mock('@/hooks/messages/useMessages', () => ({
  useMessages: useMessagesMock,
}))

vi.mock('@/hooks/core/useSuperinterfaceContext', () => ({
  useSuperinterfaceContext: vi.fn(() => superinterfaceContextValue),
}))

vi.mock('@/lib/optimistic/isOptimistic', () => ({
  isOptimistic: () => false,
}))

vi.mock('./lib/isHtmlAudioSupported', () => ({
  isHtmlAudioSupported: true,
}))

type MockAudioPlayer = {
  load: ReturnType<typeof vi.fn>
  playing: boolean
  stop: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  seek: ReturnType<typeof vi.fn>
}

const audioPlayerInstances = vi.hoisted(() => [] as MockAudioPlayer[])

vi.mock('react-use-audio-player', () => {
  const useAudioPlayer = () => {
    const ref = useRef<MockAudioPlayer | null>(null)
    if (!ref.current) {
      ref.current = {
        load: vi.fn(),
        playing: false,
        stop: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn(),
      }
      audioPlayerInstances.push(ref.current)
    }
    return ref.current
  }

  return { useAudioPlayer }
})

vi.mock('howler', () => ({
  Howler: {
    _howls: [],
  },
}))

import { useMessageAudio } from './index'

type LocaleSegment = {
  locale: string
  text: string
}

const collapse = (value: string) => value.replace(/\s+/g, ' ').trim()
const parseLocaleSegments = (raw: string): LocaleSegment[] =>
  Array.from(raw.matchAll(/<([^>]+)>([\s\S]*?)<\/\1>/g)).map(
    ([, locale, text]) => ({
      locale: locale.trim().toLowerCase(),
      text: collapse(text),
    }),
  )

const TestHarness = ({
  onEnd,
  options,
}: {
  onEnd: () => void
  options?: Record<string, any>
}) => {
  useMessageAudio({ onEnd, ...(options || {}) })
  return null
}

const flushTimers = async () => {
  await act(async () => {
    vi.advanceTimersByTime(100)
    await Promise.resolve()
  })
}

const createAssistantMessage = (
  id: string,
  text: string,
  status: SerializedMessage['status'] = 'completed',
): SerializedMessage =>
  ({
    id,
    role: 'assistant',
    created_at: Date.now(),
    content: [
      {
        type: 'text',
        text: {
          value: text,
          annotations: [],
        },
      } as any,
    ],
    run_id: 'run',
    assistant_id: 'assistant',
    thread_id: 'thread',
    attachments: [],
    metadata: {},
    status,
    runSteps: [],
  }) as SerializedMessage

describe('useMessageAudio', () => {
  beforeAll(() => {
    ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterAll(() => {
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT
  })

  beforeEach(() => {
    vi.useFakeTimers()
    mockMessages.splice(0, mockMessages.length)
    audioPlayerInstances.length = 0
    useMessagesMock.mockClear()
    superinterfaceContextValue = {
      baseUrl: 'https://example.com',
      variables: { voice: 'nova' },
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  test('default play loads first sentence and preloads the next', async () => {
    const onEnd = vi.fn()
    mockMessages.splice(
      0,
      mockMessages.length,
      createAssistantMessage('msg-1', 'First sentence. Second sentence.'),
    )

    render(<TestHarness onEnd={onEnd} />)

    await flushTimers()

    expect(audioPlayerInstances).toHaveLength(2)
    const [primaryPlayer, preloadPlayer] = audioPlayerInstances

    expect(primaryPlayer.load).toHaveBeenCalledTimes(1)
    const [firstUrl, firstOptions] = primaryPlayer.load.mock.calls[0]
    expect(firstUrl).toBe(
      'https://example.com/audio-runtimes/tts?input=First+sentence.&voice=nova',
    )
    expect(firstOptions.autoplay).toBe(false)

    await act(async () => {
      firstOptions.onload?.()
    })

    expect(preloadPlayer.load).toHaveBeenCalledTimes(1)
    const [preloadUrl] = preloadPlayer.load.mock.calls[0]
    expect(preloadUrl).toBe(
      'https://example.com/audio-runtimes/tts?input=Second+sentence.&voice=nova',
    )

    await act(async () => {
      firstOptions.onplay?.()
    })

    await act(async () => {
      firstOptions.onend?.()
    })

    await flushTimers()

    for (let i = 0; i < 3; i++) {
      await flushTimers()
    }

    expect(primaryPlayer.load).toHaveBeenCalledTimes(2)
    const [secondUrl, secondOptions] = primaryPlayer.load.mock.calls[1]
    expect(secondUrl).toBe(
      'https://example.com/audio-runtimes/tts?input=Second+sentence.&voice=nova',
    )
    expect(secondOptions.autoplay).toBe(true)

    await act(async () => {
      secondOptions.onplay?.()
    })

    await act(async () => {
      secondOptions.onend?.()
    })

    for (let i = 0; i < 3; i++) {
      await flushTimers()
    }

    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  test('custom play receives normalized sentences', async () => {
    const onEnd = vi.fn()
    const inputs: string[] = []

    const play = vi.fn(async ({ input, onPlay, onEnd }: any) => {
      onPlay()
      inputs.push(input)
      onEnd()
    })

    mockMessages.splice(
      0,
      mockMessages.length,
      createAssistantMessage('msg-3', 'First sentence. Second sentence.'),
    )

    render(
      <TestHarness
        onEnd={onEnd}
        options={{ play }}
      />,
    )

    for (let i = 0; i < 5; i++) {
      await flushTimers()
    }

    expect(play).toHaveBeenCalledTimes(2)
    expect(inputs).toEqual(['First sentence.', 'Second sentence.'])
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  test('segmentToText turns custom segment objects into inputs', async () => {
    const onEnd = vi.fn()
    const inputs: any[] = []

    const getSegments = vi.fn(() => [
      { text: 'Hello world.' },
      { text: 'Another line.' },
    ])

    const play = vi.fn(async ({ input, onPlay, onEnd }: any) => {
      onPlay()
      inputs.push(input)
      onEnd()
    })

    mockMessages.splice(
      0,
      mockMessages.length,
      createAssistantMessage('msg-4', 'ignored'),
    )

    render(
      <TestHarness
        onEnd={onEnd}
        options={{
          getSegments,
          play,
        }}
      />,
    )

    for (let i = 0; i < 5; i++) {
      await flushTimers()
    }

    expect(getSegments).toHaveBeenCalled()
    expect(play).toHaveBeenCalledTimes(2)
    expect(inputs).toEqual([
      { text: 'Hello world.' },
      { text: 'Another line.' },
    ])
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  test('custom playSegments can enqueue new batches while previous is active', async () => {
    const onEnd = vi.fn()
    const playCalls: Array<{ input: any }> = []
    const pending: Array<() => void> = []

    const play = vi.fn(({ input, onPlay, onEnd }: any) => {
      playCalls.push({ input })
      onPlay()
      return new Promise<void>((resolve) => {
        pending.push(() => {
          onEnd()
          resolve()
        })
      })
    })

    const playSegments = vi.fn(
      async ({
        segments,
        play: playSegment,
      }: {
        segments: LocaleSegment[]
        play: (segment: LocaleSegment) => Promise<void>
      }) => {
        // fire each segment without awaiting (parallel lanes)
        segments.forEach((segment) => {
          void playSegment(segment)
        })
      },
    )

    await act(async () => {
      mockMessages.splice(
        0,
        mockMessages.length,
        createAssistantMessage('msg-5', '<en>Hello.</en>', 'in_progress'),
      )
    })

    render(
      <TestHarness
        onEnd={onEnd}
        options={{
          play,
          playSegments,
          getSegments: ({ input }: { input: string }) =>
            parseLocaleSegments(input),
        }}
      />,
    )

    for (let i = 0; i < 5; i++) await flushTimers()
    expect(playSegments).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledTimes(1)
    expect(pending).toHaveLength(1)

    await act(async () => {
      mockMessages.splice(
        0,
        mockMessages.length,
        createAssistantMessage('msg-5', '<en>Hello.</en><es>Hola.</es>'),
      )
    })

    for (let i = 0; i < 5; i++) await flushTimers()
    expect(playSegments).toHaveBeenCalledTimes(2)
    expect(play).toHaveBeenCalledTimes(2)
    expect(pending).toHaveLength(2)

    pending.splice(0).forEach((resolve) => resolve())
    for (let i = 0; i < 5; i++) await flushTimers()
    expect(onEnd).toHaveBeenCalled()
  })
})
