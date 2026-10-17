import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
  vi,
} from 'vitest'
import { useLayoutEffect, useState } from 'react'
import { cleanup, configure, fireEvent, waitFor } from '@testing-library/react'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { AudioThread } from '@/components/threads/AudioThread'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import type { PlayArgs } from '@/types'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { startFakeOpenai } from '../../../../server/tests/lib/openai/startFakeOpenai'
import { createTestAssistant } from '../lib/createTestAssistant'
import { createTestOpenaiProvider } from '../lib/createTestOpenaiProvider'
import { setTestInitialMessages } from '../lib/setTestInitialMessages'
import { startFakeAudioRuntimeServer } from '../lib/startFakeAudioRuntimeServer'
import { startGatedFakeLlm } from '../lib/startGatedFakeLlm'
import { renderWithSuperinterfaceBaseUrl } from '../lib/renderWithSuperinterfaceBaseUrl'
import { readAudioThreadState } from '../lib/readAudioThreadState'
import { captureUnhandledRejections } from '../lib/captureUnhandledRejections'
import {
  installFakeAudioBrowser,
  type FakeAudioBrowser,
} from '../lib/installFakeAudioBrowser'
import { PLAYBACK_LEVEL } from '../lib/FakeAudioContext'

const ttsInput = ({ src }: { src: string }) =>
  new URL(src).searchParams.get('input')

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const SERVER_TIMEOUT = { timeout: 15_000 }

// Lets the user move the thread to another thread id, as an app with a list
// of threads would.
const ThreadSwitcher = ({ children }: { children: React.ReactNode }) => {
  const [threadId, setThreadId] = useState<string | null>(null)

  return (
    <SuperinterfaceProvider variables={threadId ? { threadId } : {}}>
      {children}
      <button
        type="button"
        aria-label="switch thread"
        onClick={() => setThreadId(crypto.randomUUID())}
      />
    </SuperinterfaceProvider>
  )
}

// Drives the assistant's audio directly, like an app with its own controls.
const AssistantControls = () => {
  const { audioRuntime } = useAudioThreadContext()

  return (
    <div>
      <button
        type="button"
        aria-label="assistant play"
        onClick={() => audioRuntime!.assistant.play()}
      />
      <button
        type="button"
        aria-label="assistant pause"
        onClick={() => audioRuntime!.assistant.pause()}
      />
      <button
        type="button"
        aria-label="assistant stop"
        onClick={() => audioRuntime!.assistant.stop()}
      />
    </div>
  )
}

type Llm = { baseURL: string; close: () => Promise<void> }

describe('AudioThread with the TTS audio runtime', () => {
  let browser: FakeAudioBrowser
  let fakeOpenai: Awaited<ReturnType<typeof startFakeOpenai>>
  let audioServer: Awaited<ReturnType<typeof startFakeAudioRuntimeServer>>
  let transcriptionStatus: number
  const llms: Llm[] = []

  beforeAll(() => {
    // The real server can be slow while other test files run alongside.
    configure({ asyncUtilTimeout: 10_000 })
    // Audio, timers and the server update the UI on their own, outside act().
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
    browser = installFakeAudioBrowser()
  })

  beforeEach(async () => {
    browser.reset()
    transcriptionStatus = 200
    fakeOpenai = await startFakeOpenai({
      handle: ({ request }) => {
        if (request.path !== '/audio/transcriptions') return undefined
        if (transcriptionStatus !== 200) {
          return {
            type: 'json',
            status: transcriptionStatus,
            json: { error: { message: 'Transcription failed' } },
          }
        }
        return { type: 'json', json: { text: 'What is the weather?' } }
      },
    })
  })

  afterEach(async () => {
    cleanup()
    await Promise.all(llms.splice(0).map((llm) => llm.close()))
    // Let open message streams finish rather than cut them off.
    await audioServer?.idle()
    await Promise.all([fakeOpenai.close(), audioServer?.close()])
  })

  const fakeLlm = async ({ content }: { content: string }) => {
    const llm = await startFakeLlm({ replies: [{ content }] })
    llms.push(llm)
    return llm
  }

  const setup = async ({
    llm,
    greeting = 'Hello!',
    initialMessages = greeting
      ? [{ role: 'ASSISTANT', content: greeting }]
      : [],
    ttsStatus,
    children = <AudioThread />,
  }: {
    llm?: Llm
    greeting?: string | null
    initialMessages?: { role: 'ASSISTANT' | 'USER'; content: string }[]
    ttsStatus?: number
    children?: React.ReactNode
  } = {}) => {
    const { assistant, privateKey, publicKey } = await createTestAssistant({
      llmBaseUrl: (llm ?? (await fakeLlm({ content: 'It is sunny.' }))).baseURL,
    })
    await createTestOpenaiProvider({
      privateKey,
      openaiBaseUrl: fakeOpenai.baseURL,
    })
    if (initialMessages.length) {
      await setTestInitialMessages({
        privateKey,
        assistantId: assistant.id,
        initialMessages,
      })
    }
    audioServer = await startFakeAudioRuntimeServer({
      upstreamBaseUrl: inject('testServer').baseUrl,
      ttsStatus,
    })

    const view = renderWithSuperinterfaceBaseUrl({
      baseUrl: audioServer.apiBaseUrl,
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children,
    })
    const state = () => readAudioThreadState({ container: view.container })
    const click = ({ index = 0 }: { index?: number } = {}) =>
      fireEvent.click(state().buttons[index].element)
    const playing = () => browser.playback.playing().map(ttsInput)

    return { assistant, publicKey, view, state, click, playing }
  }

  // Waits for the greeting to load, then plays it through.
  const listenToGreeting = async ({
    state,
    click,
    playing,
  }: Awaited<ReturnType<typeof setup>>) => {
    await waitFor(
      () => expect(browser.playback.loads.length).toBeGreaterThan(0),
      SERVER_TIMEOUT,
    )
    click()
    await waitFor(() => expect(playing()).toEqual(['Hello!']))
    await waitFor(() => expect(state().status).toBe('playing'))
    browser.playback.end()
  }

  const transcriptionRequests = () =>
    fakeOpenai.find({ method: 'POST', path: '/audio/transcriptions' })

  // First in this file: Howler is global and its first sound is the one
  // AudioThread prepares, so later tests would find an earlier test's sound.
  it('plays the speech through a crossOrigin anonymous <audio> that the assistant visualization hears', async () => {
    const view = await setup()
    const { state, click, playing } = view
    // Heights of the assistant's bars, as percentages.
    const assistantBars = () =>
      Array.from(view.view.container.querySelector('.rt-Grid')!.children).map(
        (bar) =>
          parseFloat(
            (bar.firstElementChild as HTMLElement).style.getPropertyValue(
              '--height',
            ),
          ),
      )

    await waitFor(
      () => expect(browser.playback.loads.length).toBeGreaterThan(0),
      SERVER_TIMEOUT,
    )
    expect(assistantBars()).toEqual([20, 20, 20, 20])

    click()
    await waitFor(() => expect(playing()).toEqual(['Hello!']))
    await waitFor(() => expect(state().status).toBe('playing'))

    // Web Audio can only read a cross-origin <audio> fetched anonymously.
    const [{ element }] = browser.playback.playing()
    expect(element.crossOrigin).toBe('anonymous')
    await waitFor(() =>
      expect(assistantBars()).toEqual(
        Array(4).fill((PLAYBACK_LEVEL / 255) * 100 + 20),
      ),
    )

    browser.playback.end()
    await waitFor(() => expect(assistantBars()).toEqual([20, 20, 20, 20]))
  }, 60_000)

  it('plays the greeting, records a question, sends it and speaks the reply', async () => {
    const llm = await fakeLlm({ content: 'It is sunny. Anything else?' })
    const { assistant, publicKey, state, click, playing } = await setup({
      llm,
      greeting: 'Hi there! Ask me anything.',
    })

    await waitFor(
      () => expect(browser.playback.loads.length).toBeGreaterThan(0),
      SERVER_TIMEOUT,
    )
    expect(state().status).toBe('playerPaused')
    expect(browser.playback.plays).toEqual([])

    click()

    await waitFor(() => expect(state().status).toBe('playing'))
    expect(playing()).toEqual(['Hi there!'])
    const greetingUrl = new URL(browser.playback.playing()[0].src)
    expect(greetingUrl.origin + greetingUrl.pathname).toBe(
      `${audioServer.apiBaseUrl}/audio-runtimes/tts`,
    )
    expect(greetingUrl.searchParams.get('publicApiKey')).toBe(publicKey)
    expect(greetingUrl.searchParams.get('assistantId')).toBe(assistant.id)
    // The next sentence is fetched ahead while the first one plays.
    await waitFor(() =>
      expect(
        audioServer
          .find({ path: '/audio-runtimes/tts' })
          .map(({ query }) => query.get('input')),
      ).toContain('Ask me anything.'),
    )

    browser.playback.end()
    await waitFor(() => expect(playing()).toEqual(['Ask me anything.']))
    browser.playback.end()

    // The microphone has not been allowed yet, so it waits for a click.
    await waitFor(() => expect(state().status).toBe('idle'))
    expect(browser.microphone.getUserMediaCalls).toEqual([])

    click()
    await waitFor(() => expect(state().status).toBe('recording'))
    expect(browser.microphone.getUserMediaCalls).toEqual([
      { audio: true, video: false },
    ])

    // Speaking, then 1.5s of silence, sends the recording.
    browser.microphone.speak()
    await sleep(300)
    browser.microphone.silence()

    await waitFor(() => expect(state().status).toBe('thinking'), {
      timeout: 5_000,
    })
    await waitFor(
      () => expect(playing()).toEqual(['It is sunny.']),
      SERVER_TIMEOUT,
    )
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)

    const [transcription] = transcriptionRequests()
    expect(transcription.body).toContain('fake-webm-audio')
    const [completion] = (
      llm as Awaited<ReturnType<typeof startFakeLlm>>
    ).completionRequests()
    expect(
      completion.body.messages.map(
        ({ role, content }: { role: string; content: string }) => ({
          role,
          content,
        }),
      ),
    ).toEqual([
      { role: 'assistant', content: 'Hi there! Ask me anything.' },
      { role: 'user', content: 'What is the weather?' },
    ])

    browser.playback.end()
    await waitFor(() => expect(playing()).toEqual(['Anything else?']))
    browser.playback.end()

    await waitFor(() => expect(playing()).toEqual([]))
    expect(browser.playback.plays.map(ttsInput)).toEqual([
      'Hi there!',
      'Ask me anything.',
      'It is sunny.',
      'Anything else?',
    ])

    // BUG: useTtsAudioRuntime passes usePermission a new descriptor on
    // every render, so it queries the permission again after each render,
    // and its lazy state updater can run after the effect cleanup has
    // dropped the status, flipping the permission to ''. Whether the
    // microphone re-opens after this reply is therefore random (see the
    // Firefox test below for the deterministic case).
    expect(browser.microphone.permissionQueries).toBeGreaterThan(10)
  }, 60_000)

  it('pauses, resumes and sends a recording by hand', async () => {
    const view = await setup()
    const { state, click, playing } = view
    await listenToGreeting(view)

    await waitFor(() => expect(state().status).toBe('idle'))
    click()
    await waitFor(() => expect(state().status).toBe('recording'))

    // Silence alone never sends: nothing was said yet.
    await sleep(2_000)
    expect(state().status).toBe('recording')
    expect(transcriptionRequests()).toEqual([])

    const [recorder] = browser.MediaRecorder.instances
    click({ index: 0 })
    await waitFor(() => expect(state().status).toBe('recorderPaused'))
    expect(recorder.state).toBe('paused')

    click()
    await waitFor(() => expect(state().status).toBe('recording'))
    expect(recorder.state).toBe('recording')

    browser.microphone.speak()
    click({ index: 1 })
    await waitFor(() => expect(playing()).toEqual(['It is sunny.']), {
      timeout: 15_000,
    })
    expect(recorder.state).toBe('inactive')
    expect(transcriptionRequests()).toHaveLength(1)
  }, 60_000)

  it('listens right after the greeting when the microphone is already allowed', async () => {
    browser.microphone.permissionStatus.state = 'granted'
    const view = await setup()
    await listenToGreeting(view)

    await waitFor(() => expect(view.state().status).toBe('recording'))
    expect(browser.microphone.getUserMediaCalls).toHaveLength(1)
  }, 60_000)

  it('stops the greeting and listens when the user interrupts it', async () => {
    const view = await setup({ greeting: 'Hello! This is a long greeting.' })
    const { state, click, playing } = view

    await waitFor(
      () => expect(browser.playback.loads.length).toBeGreaterThan(0),
      SERVER_TIMEOUT,
    )
    click()
    await waitFor(() => expect(playing()).toEqual(['Hello!']))
    await waitFor(() => expect(state().status).toBe('playing'))

    click()

    await waitFor(() => expect(state().status).toBe('recording'))
    expect(playing()).toEqual([])
    await sleep(200)
    expect(browser.playback.plays.map(ttsInput)).toEqual(['Hello!'])
  }, 60_000)

  it('stops speaking the reply when the user interrupts it', async () => {
    browser.microphone.permissionStatus.state = 'granted'
    const llm = await fakeLlm({ content: 'It is sunny. Here is more.' })
    const view = await setup({ llm })
    const { state, click, playing } = view
    await listenToGreeting(view)
    await waitFor(() => expect(state().status).toBe('recording'))

    browser.microphone.speak()
    click({ index: 1 })
    await waitFor(() => expect(playing()).toEqual(['It is sunny.']), {
      timeout: 15_000,
    })
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)

    click()

    await waitFor(() => expect(state().status).toBe('recording'))
    await sleep(200)
    expect(browser.playback.plays.map(ttsInput)).toEqual([
      'Hello!',
      'It is sunny.',
    ])
    expect(browser.MediaRecorder.instances).toHaveLength(2)
  }, 60_000)

  it('BUG: hides the error and listens again when sending fails', async () => {
    browser.microphone.permissionStatus.state = 'granted'
    transcriptionStatus = 500
    const view = await setup()
    const { state, click } = view
    await listenToGreeting(view)
    await waitFor(() => expect(state().status).toBe('recording'))

    const unhandled = captureUnhandledRejections()
    try {
      browser.microphone.speak()
      click({ index: 1 })

      await waitFor(
        () => expect(browser.MediaRecorder.instances).toHaveLength(2),
        SERVER_TIMEOUT,
      )
      await waitFor(() => expect(state().status).toBe('recording'))
      await waitFor(() => expect(unhandled.reasons).toHaveLength(1))
    } finally {
      unhandled.restore()
    }

    expect(transcriptionRequests()).toHaveLength(1)
    // BUG: the TTS runtime reads the toasts context from outside the
    // ToastsProvider that AudioThread.Root renders, so the error toast goes
    // nowhere. Thread shows the same server error as a toast.
    expect(document.body.textContent).not.toContain('Failed to send')
    // BUG: the failed createMessage promise is returned from the recorder's
    // stop handler, where nothing catches it.
    expect(unhandled.reasons[0]).toBeInstanceOf(Error)
  }, 60_000)

  it('BUG: gives no feedback when the microphone is blocked', async () => {
    browser.microphone.allow = false
    const view = await setup()
    const { state, click } = view
    await listenToGreeting(view)
    await waitFor(() => expect(state().status).toBe('idle'))

    click()

    await waitFor(() =>
      expect(browser.microphone.getUserMediaCalls).toHaveLength(1),
    )
    await sleep(200)
    expect(browser.microphone.permissionStatus.state).toBe('denied')
    // BUG: the recorder has no error handler, so the button stays the same
    // and nothing tells the user the microphone is blocked.
    expect(state().status).toBe('idle')
    expect(view.view.container.textContent).not.toMatch(/microphone/i)
  }, 60_000)

  it.each([
    { case: 'the thread is empty', initialMessages: [] },
    {
      case: 'the latest message is the user’s',
      initialMessages: [{ role: 'USER' as const, content: 'Hi!' }],
    },
  ])(
    'BUG: never lets the user speak when $case',
    async ({ initialMessages }) => {
      const { state, click } = await setup({ initialMessages })

      await waitFor(() =>
        expect(
          audioServer.proxiedRequests.filter(
            ({ path, status }) => path === '/api/messages' && status,
          ),
        ).toHaveLength(1),
      )
      await sleep(300)
      expect(state().status).toBe('playerPaused')

      click()
      await sleep(500)

      // BUG: the button resumes a sound that does not exist, and recording
      // only ever starts after the assistant has spoken.
      expect(state().status).toBe('playerPaused')
      expect(browser.playback.plays).toEqual([])
      expect(browser.microphone.getUserMediaCalls).toEqual([])
    },
    60_000,
  )

  it('BUG: stays waiting when the speech fails to load', async () => {
    const { state, click } = await setup({ ttsStatus: 500 })

    await waitFor(
      () =>
        expect(audioServer.find({ path: '/audio-runtimes/tts' })).toHaveLength(
          1,
        ),
      SERVER_TIMEOUT,
    )
    await sleep(200)
    click()
    await sleep(500)

    // BUG: load errors are ignored, so the greeting never plays and the
    // user can never get to recording.
    expect(state().status).toBe('playerPaused')
    expect(browser.playback.plays).toEqual([])
  }, 60_000)

  it('BUG: stays thinking after a reply without text', async () => {
    browser.microphone.permissionStatus.state = 'granted'
    const llm = await fakeLlm({ content: '' })
    const view = await setup({ llm })
    const { state, click } = view
    await listenToGreeting(view)
    await waitFor(() => expect(state().status).toBe('recording'))

    browser.microphone.speak()
    click({ index: 1 })
    await waitFor(
      () => expect(transcriptionRequests()).toHaveLength(1),
      SERVER_TIMEOUT,
    )
    await sleep(3_000)

    // BUG: with nothing to say, onEnd never runs, so the recorder stays
    // stopped and the only button is disabled.
    expect(state().status).toBe('thinking')
    expect(state().buttons.map(({ disabled }) => disabled)).toEqual([true])
    expect(browser.playback.plays.map(ttsInput)).toEqual(['Hello!'])
  }, 60_000)

  it('plays through a custom play function and calls a custom onEnd', async () => {
    const plays: string[] = []
    const play = vi.fn(({ input, onPlay, onEnd }: PlayArgs) => {
      plays.push(input)
      onPlay()
      setTimeout(onEnd, 10)
    })
    const onEnd = vi.fn()
    const { state } = await setup({
      greeting: 'Hello! How are you?',
      children: (
        <AudioThread
          play={play}
          onEnd={onEnd}
        />
      ),
    })

    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1), SERVER_TIMEOUT)
    expect(plays).toEqual(['Hello!', 'How are you?'])
    expect(browser.playback.loads).toEqual([])
    expect(browser.microphone.getUserMediaCalls).toEqual([])
    await waitFor(() => expect(state().status).toBe('idle'))
  }, 60_000)

  it('stops a custom play when it reports a stop', async () => {
    const play = vi.fn(({ onPlay, onStop }: PlayArgs) => {
      onPlay()
      setTimeout(onStop, 10)
    })
    const onEnd = vi.fn()
    const { state } = await setup({
      greeting: 'Hello! How are you?',
      children: (
        <AudioThread
          play={play}
          onEnd={onEnd}
        />
      ),
    })

    await waitFor(() => expect(play).toHaveBeenCalledTimes(1), SERVER_TIMEOUT)
    await waitFor(() => expect(state().status).toBe('idle'))
    await sleep(200)
    expect(play).toHaveBeenCalledTimes(1)
    expect(onEnd).not.toHaveBeenCalled()
  }, 60_000)

  // A custom onEnd shows exactly when the runtime considers the assistant
  // done (the default one depends on the flaky permission state, see above).
  it('speaks a streamed reply sentence by sentence as it completes', async () => {
    const onEnd = vi.fn()
    const llm = await startGatedFakeLlm({
      chunks: ['It is sunny. And', ' warm today.', ' Bye', '.'],
    })
    llms.push(llm)
    const view = await setup({ llm, children: <AudioThread onEnd={onEnd} /> })
    const { state, click, playing } = view
    await listenToGreeting(view)
    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1))
    click()
    await waitFor(() => expect(state().status).toBe('recording'))
    const ttsInputs = () =>
      audioServer
        .find({ path: '/audio-runtimes/tts' })
        .map(({ query }) => query.get('input'))
    const nothingPlaysFor = async ({ ms }: { ms: number }) => {
      await sleep(ms)
      expect(playing()).toEqual([])
    }

    browser.microphone.speak()
    click({ index: 1 })

    // The finished first sentence plays while the reply is still streaming.
    await waitFor(() => expect(playing()).toEqual(['It is sunny.']), {
      timeout: 15_000,
    })
    expect(state().status).toBe('thinking')
    browser.playback.end()

    // "And" is not a full sentence yet: it is neither played nor fetched.
    await nothingPlaysFor({ ms: 300 })
    expect(ttsInputs()).not.toContain('And')

    llm.release()
    await waitFor(() => expect(playing()).toEqual(['And warm today.']))
    browser.playback.end()

    // Everything said so far is played, but the reply goes on.
    llm.release()
    await nothingPlaysFor({ ms: 300 })
    expect(onEnd).toHaveBeenCalledTimes(1)

    llm.release()
    await waitFor(() => expect(playing()).toEqual(['Bye.']))
    browser.playback.end()

    // It waits for the reply to finish before it is done.
    await nothingPlaysFor({ ms: 300 })
    expect(onEnd).toHaveBeenCalledTimes(1)

    llm.release()
    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(2))
    expect(browser.playback.plays.map(ttsInput)).toEqual([
      'Hello!',
      'It is sunny.',
      'And warm today.',
      'Bye.',
    ])
  }, 60_000)

  it('is done once the last sentence stops when it ends as the reply completes', async () => {
    const sentences: PlayArgs[] = []
    const play = vi.fn((args: PlayArgs) => {
      sentences.push(args)
      args.onPlay()
    })
    const played = () => sentences.map(({ input }) => input)
    // Whether the assistant was pending in the latest render, at each onEnd.
    let isPending: boolean | null = null
    const pendingAtEnd: (boolean | null)[] = []
    const onEnd = vi.fn(() => pendingAtEnd.push(isPending))
    let endOnCompletion: (() => void) | null = null

    // Ends the playing sentence in the commit that shows the reply as
    // completed, as a player finishing right when the reply does.
    const Probe = () => {
      const { latestMessage } = useLatestMessage()
      const { audioRuntime } = useAudioThreadContext()
      isPending = audioRuntime!.assistant.isPending
      const status = latestMessage?.status

      useLayoutEffect(() => {
        if (status !== 'completed' || !endOnCompletion) return
        endOnCompletion()
        endOnCompletion = null
      }, [status])

      return null
    }

    const llm = await startGatedFakeLlm({ chunks: ['It is sunny.', ' Bye.'] })
    llms.push(llm)
    const { state, click } = await setup({
      llm,
      children: (
        <AudioThread.Root
          play={play}
          onEnd={onEnd}
        >
          <AudioThread.Status />
          <AudioThread.Form />
          <Probe />
        </AudioThread.Root>
      ),
    })

    await waitFor(() => expect(played()).toEqual(['Hello!']), SERVER_TIMEOUT)
    // The greeting is complete, so its last sentence ending is the end.
    sentences[0].onEnd()
    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1))
    click()
    await waitFor(() => expect(state().status).toBe('recording'))
    browser.microphone.speak()
    click({ index: 1 })

    await waitFor(() => expect(played()).toEqual(['Hello!', 'It is sunny.']), {
      timeout: 15_000,
    })
    sentences[1].onEnd()
    // The reply goes on, so it is not done.
    await sleep(300)
    expect(onEnd).toHaveBeenCalledTimes(1)

    llm.release()
    await waitFor(() =>
      expect(played()).toEqual(['Hello!', 'It is sunny.', 'Bye.']),
    )
    endOnCompletion = sentences[2].onEnd
    llm.release()

    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(2))
    expect(endOnCompletion).toBeNull()
    await sleep(300)
    expect(onEnd).toHaveBeenCalledTimes(2)
    // The greeting ends in the player's callback, while the last render still
    // shows it playing. The reply waits for the render where it stopped.
    expect(pendingAtEnd).toEqual([true, false])
  }, 60_000)

  it('lets custom controls pause, resume and replay the assistant', async () => {
    const view = await setup({
      greeting: 'Hello! How are you?',
      children: (
        <AudioThread.Root>
          <AudioThread.Status />
          <AudioThread.Form />
          <AssistantControls />
        </AudioThread.Root>
      ),
    })
    const { state, click, playing } = view
    const press = (label: string) =>
      fireEvent.click(
        state().buttons.find(
          ({ element }) => element.getAttribute('aria-label') === label,
        )!.element,
      )

    await waitFor(
      () => expect(browser.playback.loads.length).toBeGreaterThan(0),
      SERVER_TIMEOUT,
    )
    press('assistant play')
    await waitFor(() => expect(state().status).toBe('playing'))
    expect(playing()).toEqual(['Hello!'])

    press('assistant pause')
    await waitFor(() => expect(state().status).toBe('playerPaused'))
    expect(playing()).toEqual([])

    click()
    await waitFor(() => expect(state().status).toBe('playing'))
    expect(playing()).toEqual(['Hello!'])

    // Stopping drops the rest of the message.
    press('assistant stop')
    await waitFor(() => expect(state().status).toBe('idle'))

    // Playing again replays the stopped sentence without resuming the
    // message.
    press('assistant play')
    await waitFor(() => expect(playing()).toEqual(['Hello!']))
    browser.playback.end()
    await sleep(300)
    expect(browser.playback.plays.map(ttsInput)).toEqual([
      'Hello!',
      'Hello!',
      'Hello!',
    ])
    expect(state().status).toBe('idle')
  }, 60_000)

  it('is done when the thread changes after the reply was spoken but not finished', async () => {
    const onEnd = vi.fn()
    const llm = await startGatedFakeLlm({ chunks: ['It is sunny.'] })
    llms.push(llm)
    const view = await setup({
      llm,
      children: (
        <ThreadSwitcher>
          <AudioThread onEnd={onEnd} />
        </ThreadSwitcher>
      ),
    })
    const { state, click, playing } = view
    await listenToGreeting(view)
    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(1))
    click()
    await waitFor(() => expect(state().status).toBe('recording'))

    browser.microphone.speak()
    click({ index: 1 })
    await waitFor(() => expect(playing()).toEqual(['It is sunny.']), {
      timeout: 15_000,
    })
    browser.playback.end()
    await sleep(300)
    expect(onEnd).toHaveBeenCalledTimes(1)

    fireEvent.click(
      state().buttons.find(
        ({ element }) => element.getAttribute('aria-label') === 'switch thread',
      )!.element,
    )

    await waitFor(() => expect(onEnd).toHaveBeenCalledTimes(2))

    // Let the reply finish (cutting it off fails the send).
    llm.release()
    await audioServer.idle()
  }, 60_000)

  it('BUG: gets stuck after the first reply where the microphone permission cannot be queried', async () => {
    browser.microphone.canQueryPermission = false
    const view = await setup()
    const { state, click, playing } = view
    await listenToGreeting(view)

    await waitFor(() => expect(state().status).toBe('idle'))
    click()
    await waitFor(() => expect(state().status).toBe('recording'))
    browser.microphone.speak()
    click({ index: 1 })
    await waitFor(() => expect(playing()).toEqual(['It is sunny.']), {
      timeout: 15_000,
    })
    await waitFor(() => expect(state().status).toBe('playing'))
    browser.playback.end()
    await sleep(500)

    // BUG: listening again needs the permission to read 'granted', and the
    // recorder stays stopped otherwise, which leaves only a disabled button.
    expect(state().status).toBe('thinking')
    expect(state().buttons.map(({ disabled }) => disabled)).toEqual([true])
    expect(browser.MediaRecorder.instances).toHaveLength(1)
  }, 60_000)
})
