import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import {
  vi,
  describe,
  beforeEach,
  afterEach,
  expect,
  test,
  beforeAll,
  afterAll,
} from 'vitest'
import type { SerializedMessage, PlayArgs } from '@/types'

const messagesList = vi.hoisted(() => [] as SerializedMessage[])

const useMessagesMock = vi.hoisted(() =>
  vi.fn(() => ({
    messages: [...messagesList],
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

const TestHarness = ({
  onEnd,
  play,
}: {
  onEnd: () => void
  play?: Parameters<typeof useMessageAudio>[0]['play']
}) => {
  useMessageAudio({ onEnd, play })
  return null
}

const flushEffects = async () => {
  await act(async () => {
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
    audioPlayerInstances.length = 0
    messagesList.length = 0
    useMessagesMock.mockClear()
    superinterfaceContextValue = {
      baseUrl: 'https://example.com',
      variables: { voice: 'nova' },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('default play speaks buffered sentences in order', async () => {
    const onEnd = vi.fn()
    messagesList.push(
      createAssistantMessage('msg-1', 'First sentence. Second sentence.'),
    )

    render(<TestHarness onEnd={onEnd} />)
    await flushEffects()

    expect(audioPlayerInstances).toHaveLength(2)

    const [primaryPlayer, preloadPlayer] = audioPlayerInstances
    expect(primaryPlayer.load).toHaveBeenCalledTimes(1)
    const [firstUrl, firstOpts] = primaryPlayer.load.mock.calls[0]
    expect(firstUrl).toBe(
      'https://example.com/audio-runtimes/tts?input=First+sentence.&voice=nova',
    )
    expect(firstOpts.autoplay).toBe(false)

    await act(async () => {
      firstOpts.onload?.()
    })

    expect(preloadPlayer.load).toHaveBeenCalledTimes(1)

    await act(async () => {
      firstOpts.onplay?.()
      firstOpts.onend?.()
    })
    await flushEffects()

    expect(primaryPlayer.load).toHaveBeenCalledTimes(2)
    const [secondUrl, secondOpts] = primaryPlayer.load.mock.calls[1]
    expect(secondUrl).toBe(
      'https://example.com/audio-runtimes/tts?input=Second+sentence.&voice=nova',
    )

    await act(async () => {
      secondOpts.onplay?.()
      secondOpts.onend?.()
    })
    await flushEffects()

    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  test('default play flushes leftovers on completion', async () => {
    const onEnd = vi.fn()
    messagesList.push(
      createAssistantMessage('msg-2', 'Trailing fragment', 'completed'),
    )

    render(<TestHarness onEnd={onEnd} />)
    await flushEffects()

    const player = audioPlayerInstances[0]
    const [, opts] = player.load.mock.calls[0]

    await act(async () => {
      opts.onplay?.()
      opts.onend?.()
    })
    await flushEffects()

    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  test('custom play receives incremental updates', async () => {
    const onEnd = vi.fn()
    const play = vi.fn(
      ({ onEnd: chunkEnd }: PlayArgs & { message?: SerializedMessage }) => {
        chunkEnd()
      },
    )

    const view = render(
      <TestHarness
        onEnd={onEnd}
        play={play}
      />,
    )

    messagesList.push(createAssistantMessage('msg-a', 'Hello', 'in_progress'))
    await act(async () =>
      view.rerender(
        <TestHarness
          onEnd={onEnd}
          play={play}
        />,
      ),
    )
    await flushEffects()
    expect(play).toHaveBeenCalledTimes(1)
    expect(play.mock.calls[0][0]).toMatchObject({
      input: 'Hello',
      message: expect.objectContaining({ id: 'msg-a' }),
    })

    messagesList.splice(
      0,
      1,
      createAssistantMessage('msg-a', 'Hello world.', 'in_progress'),
    )
    await act(async () =>
      view.rerender(
        <TestHarness
          onEnd={onEnd}
          play={play}
        />,
      ),
    )
    await flushEffects()
    expect(play).toHaveBeenCalledTimes(2)
    expect(play.mock.calls[1][0]).toMatchObject({
      input: ' world.',
      message: expect.objectContaining({ id: 'msg-a' }),
    })

    messagesList.splice(
      0,
      1,
      createAssistantMessage('msg-a', 'Hello world.', 'completed'),
    )
    await act(async () =>
      view.rerender(
        <TestHarness
          onEnd={onEnd}
          play={play}
        />,
      ),
    )
    await flushEffects()

    expect(play).toHaveBeenCalledTimes(3)
    expect(play.mock.calls[2][0]).toMatchObject({
      input: '',
      message: expect.objectContaining({ id: 'msg-a', status: 'completed' }),
    })
    await flushEffects()

    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})
