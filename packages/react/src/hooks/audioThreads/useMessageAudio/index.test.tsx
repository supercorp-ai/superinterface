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
  fullSentenceRegex,
  onResult = () => {},
}: {
  onEnd: () => void
  play?: Parameters<typeof useMessageAudio>[0]['play']
  fullSentenceRegex?: RegExp
  onResult?: (result: ReturnType<typeof useMessageAudio>) => void
}) => {
  onResult(useMessageAudio({ onEnd, play, fullSentenceRegex }))
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
    // Once audio has played, the next sentences start on their own.
    expect(secondOpts.autoplay).toBe(true)

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

  test('custom play receives each sentence once it is complete', async () => {
    const onEnd = vi.fn()
    const play = vi.fn(({ onEnd: chunkEnd }: PlayArgs) => {
      chunkEnd()
    })

    const view = render(
      <TestHarness
        onEnd={onEnd}
        play={play}
      />,
    )

    // A streaming sentence without its ending is not spoken yet.
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
    expect(play).not.toHaveBeenCalled()

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
    expect(play).toHaveBeenCalledTimes(1)
    expect(play.mock.calls[0][0]).toMatchObject({ input: 'Hello world.' })
    // The message is still streaming, so it is not over yet.
    expect(onEnd).not.toHaveBeenCalled()

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

    expect(play).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  test('sets isAudioPlayed once audio has played, so the next sentences autoplay', async () => {
    let result: ReturnType<typeof useMessageAudio> | null = null
    messagesList.push(
      createAssistantMessage('msg-p', 'First sentence. Second sentence.'),
    )

    render(
      <TestHarness
        onEnd={vi.fn()}
        onResult={(current) => {
          result = current
        }}
      />,
    )
    await flushEffects()

    const [player] = audioPlayerInstances
    const [, firstOpts] = player.load.mock.calls[0]
    // Nothing has played yet: the first sentence waits for the user.
    expect(result!.isAudioPlayed).toBe(false)
    expect(firstOpts.autoplay).toBe(false)

    // onplay: the first sentence starts playing.
    await act(async () => {
      firstOpts.onplay?.()
    })
    expect(result!.isAudioPlayed).toBe(true)

    await act(async () => {
      firstOpts.onend?.()
    })
    await flushEffects()

    const [, secondOpts] = player.load.mock.calls[1]
    expect(secondOpts.autoplay).toBe(true)
  })

  test('is not done when the user stops a sentence that came after one that ended while streaming', async () => {
    const onEnd = vi.fn()
    const sentences: PlayArgs[] = []
    const play = vi.fn((args: PlayArgs) => {
      sentences.push(args)
    })
    const rerender = async ({
      text,
      status,
    }: {
      text: string
      status: SerializedMessage['status']
    }) => {
      messagesList.splice(0, 1, createAssistantMessage('msg-s', text, status))
      await act(async () =>
        view.rerender(
          <TestHarness
            onEnd={onEnd}
            play={play}
          />,
        ),
      )
      await flushEffects()
    }
    messagesList.push(createAssistantMessage('msg-s', 'One.', 'in_progress'))
    const view = render(
      <TestHarness
        onEnd={onEnd}
        play={play}
      />,
    )
    await flushEffects()
    expect(sentences.map(({ input }) => input)).toEqual(['One.'])

    // The only sentence so far ends while the message is still streaming, so
    // the hook remembers that its last sentence was played
    // (isLastSentencePlayedRef) and would be done once the message completes.
    await act(async () => {
      sentences[0].onPlay()
      sentences[0].onEnd()
    })
    await flushEffects()
    expect(onEnd).not.toHaveBeenCalled()

    // More text came: playing 'Two.' (isPlaying) forgets that the last
    // sentence was played.
    await rerender({ text: 'One. Two.', status: 'in_progress' })
    expect(sentences.map(({ input }) => input)).toEqual(['One.', 'Two.'])

    // The user stops the second sentence, which leaves nothing unplayed, then
    // the message completes. Had the hook still remembered the first
    // sentence as the last one played, completing would call onEnd.
    await act(async () => {
      sentences[1].onStop()
    })
    await flushEffects()
    await rerender({ text: 'One. Two.', status: 'completed' })

    expect(onEnd).not.toHaveBeenCalled()
    expect(play).toHaveBeenCalledTimes(2)
  })

  // MessageAudioOverrides only types `play`, so no component passes a
  // fullSentenceRegex; it is covered on the hook itself.
  test('a custom fullSentenceRegex decides when a streamed sentence is complete', async () => {
    const play = vi.fn()
    messagesList.push(
      createAssistantMessage('msg-b', 'Hello world;', 'in_progress'),
    )

    render(
      <TestHarness
        onEnd={vi.fn()}
        play={play}
        fullSentenceRegex={/[.;]$/}
      />,
    )
    await flushEffects()

    expect(play).toHaveBeenCalledTimes(1)
    expect(play.mock.calls[0][0]).toMatchObject({ input: 'Hello world;' })
  })
})
