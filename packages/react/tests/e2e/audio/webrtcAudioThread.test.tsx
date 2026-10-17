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
import { cleanup, configure, fireEvent, waitFor } from '@testing-library/react'
import { AudioThread } from '@/components/threads/AudioThread'
import { WebrtcAudioRuntimeProvider } from '@/components/audioRuntimes/WebrtcAudioRuntimeProvider'
import { useAudioThreadContext } from '@/hooks/threads/useAudioThreadContext'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import {
  FAKE_ANSWER_SDP,
  startFakeAudioRuntimeServer,
  type FakeWebrtcAnswer,
  type FakeWebrtcEventsReply,
} from '../lib/startFakeAudioRuntimeServer'
import { renderWithSuperinterfaceBaseUrl } from '../lib/renderWithSuperinterfaceBaseUrl'
import { readAudioThreadState } from '../lib/readAudioThreadState'
import { captureUnhandledRejections } from '../lib/captureUnhandledRejections'
import { FakeMediaStream } from '../lib/fakeMicrophone'
import {
  installFakeAudioBrowser,
  type FakeAudioBrowser,
} from '../lib/installFakeAudioBrowser'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const SERVER_TIMEOUT = { timeout: 15_000 }

const line = (value: unknown) => `${JSON.stringify(value)}\n`

type RuntimeSnapshot = {
  user: { isPending: boolean; rawStatus: string | undefined }
  assistant: {
    playing: boolean
    paused: boolean
    isPending: boolean
    isReady: boolean
    isAudioPlayed: boolean
  }
}

// Records each state the WebRTC audio runtime (from useAudioThreadContext)
// reports, once per change, as an app reading it would see them.
const RuntimeProbe = ({ snapshots }: { snapshots: RuntimeSnapshot[] }) => {
  const { audioRuntime } = useAudioThreadContext()
  const { user, assistant } = audioRuntime!
  const snapshot: RuntimeSnapshot = {
    user: { isPending: user.isPending, rawStatus: user.rawStatus },
    assistant: {
      playing: assistant.playing,
      paused: assistant.paused,
      isPending: assistant.isPending,
      isReady: assistant.isReady,
      isAudioPlayed: assistant.isAudioPlayed,
    },
  }

  if (JSON.stringify(snapshots.at(-1)) !== JSON.stringify(snapshot)) {
    snapshots.push(snapshot)
  }

  return null
}

// What the runtime reports before the session starts.
const INITIAL_RUNTIME: RuntimeSnapshot = {
  user: { isPending: false, rawStatus: 'idle' },
  assistant: {
    playing: false,
    paused: false,
    isPending: true,
    isReady: false,
    isAudioPlayed: false,
  },
}

// What it reports once the session is connected and the assistant speaks.
const CONNECTED_RUNTIME: RuntimeSnapshot = {
  user: { isPending: false, rawStatus: 'idle' },
  assistant: {
    playing: true,
    paused: false,
    isPending: false,
    isReady: true,
    isAudioPlayed: true,
  },
}

// What it reports after the session failed to start.
const FAILED_RUNTIME: RuntimeSnapshot = {
  user: { isPending: false, rawStatus: 'stopped' },
  assistant: {
    playing: true,
    paused: false,
    isPending: false,
    isReady: false,
    isAudioPlayed: false,
  },
}

// Lets a test drive the runtime directly, like an app with its own controls.
const RuntimeControls = () => {
  const { audioRuntime } = useAudioThreadContext()

  return (
    <div>
      <button
        type="button"
        aria-label="user start"
        onClick={() => audioRuntime!.user.start()}
      />
      <button
        type="button"
        aria-label="user pause"
        onClick={() => audioRuntime!.user.pause()}
      />
      <button
        type="button"
        aria-label="assistant pause"
        onClick={() => audioRuntime!.assistant.pause()}
      />
      <button
        type="button"
        aria-label="assistant play"
        onClick={() => audioRuntime!.assistant.play()}
      />
    </div>
  )
}

describe('AudioThread with the WebRTC audio runtime', () => {
  let browser: FakeAudioBrowser
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let audioServer: Awaited<ReturnType<typeof startFakeAudioRuntimeServer>>

  beforeAll(() => {
    // The real server can be slow while other test files run alongside.
    configure({ asyncUtilTimeout: 10_000 })
    // Audio, timers and the server update the UI on their own, outside act().
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
    browser = installFakeAudioBrowser()
  })

  beforeEach(async () => {
    browser.reset()
    fakeLlm = await startFakeLlm()
  })

  afterEach(async () => {
    cleanup()
    vi.restoreAllMocks()
    await audioServer?.idle()
    await Promise.all([fakeLlm.close(), audioServer?.close()])
  })

  const setup = async ({
    webrtcAnswer,
    webrtcEvents,
    children = <AudioThread />,
  }: {
    webrtcAnswer?: FakeWebrtcAnswer
    webrtcEvents?: (args: {
      event: Record<string, unknown>
    }) => FakeWebrtcEventsReply
    children?: React.ReactNode
  } = {}) => {
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    audioServer = await startFakeAudioRuntimeServer({
      upstreamBaseUrl: inject('testServer').baseUrl,
      webrtcAnswer,
      webrtcEvents,
    })

    const snapshots: RuntimeSnapshot[] = []
    const view = renderWithSuperinterfaceBaseUrl({
      baseUrl: audioServer.apiBaseUrl,
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: (
        <WebrtcAudioRuntimeProvider>
          {children}
          <RuntimeProbe snapshots={snapshots} />
        </WebrtcAudioRuntimeProvider>
      ),
    })
    const runtime = () => snapshots.at(-1)
    const state = () => readAudioThreadState({ container: view.container })
    const click = () => fireEvent.click(state().buttons[0].element)
    const peer = () => browser.RTCPeerConnection.instances[0]
    const eventRequests = () =>
      audioServer.find({ path: '/audio-runtimes/webrtc/events' })

    return {
      assistant,
      publicKey,
      view,
      state,
      click,
      peer,
      eventRequests,
      snapshots,
      runtime,
    }
  }

  // Heights of the bars of a visualizer, as percentages.
  const barHeights = ({ grid }: { grid: Element }) =>
    Array.from(grid.children).map((bar) =>
      parseFloat(
        (bar.firstElementChild as HTMLElement).style.getPropertyValue(
          '--height',
        ),
      ),
    )

  const visualizers = ({ container }: { container: HTMLElement }) => {
    const [assistant, user] = Array.from(container.querySelectorAll('.rt-Grid'))
    return {
      assistant: barHeights({ grid: assistant }),
      user: barHeights({ grid: user }),
    }
  }

  it('connects a realtime session and plays the assistant voice', async () => {
    const { assistant, publicKey, view, state, click, peer } = await setup()

    await waitFor(() => expect(state().status).toBe('playerPaused'))
    expect(browser.RTCPeerConnection.instances).toEqual([])
    expect(visualizers(view)).toEqual({
      assistant: [20, 20, 20, 20],
      user: [20, 20, 20, 20],
    })

    click()

    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)

    expect(peer().configuration.iceServers).toHaveLength(6)
    expect(peer().dataChannels.map(({ label }) => label)).toEqual([
      'oai-events',
    ])
    const [microphoneStream] = browser.microphone.streams
    expect(peer().senders).toEqual([
      { track: microphoneStream.getTracks()[0], stream: microphoneStream },
    ])

    const [offer] = audioServer.find({ path: '/audio-runtimes/webrtc' })
    expect(offer.method).toBe('POST')
    expect(offer.body).toBe(peer().localDescription!.sdp)
    expect(offer.query.get('publicApiKey')).toBe(publicKey)
    expect(offer.query.get('assistantId')).toBe(assistant.id)
    expect(peer().remoteDescription).toEqual({
      type: 'answer',
      sdp: FAKE_ANSWER_SDP,
    })

    // The assistant's voice comes in on the remote stream.
    await waitFor(() =>
      expect(
        browser.playback.playing().map(({ srcObject }) => srcObject),
      ).toEqual([peer().remoteStream]),
    )

    // Both visualizers follow the live audio.
    browser.microphone.speak()
    browser.RTCPeerConnection.remoteVoice.level = 51
    const height = ({ level }: { level: number }) => (level / 255) * 100 + 20
    await waitFor(() =>
      expect(visualizers(view)).toEqual({
        assistant: Array(4).fill(height({ level: 51 })),
        user: Array(4).fill(height({ level: 128 })),
      }),
    )
  }, 60_000)

  it('shows the user as pending while the session connects, then the assistant as ready and speaking', async () => {
    const { getUserMedia } = browser.microphone.mediaDevices
    let openMicrophone = () => {}
    vi.spyOn(
      browser.microphone.mediaDevices,
      'getUserMedia',
    ).mockImplementation(
      (constraints) =>
        new Promise((resolve, reject) => {
          openMicrophone = () => {
            getUserMedia(constraints).then(resolve, reject)
          }
        }),
    )
    const { state, click, snapshots, runtime } = await setup()
    await waitFor(() => expect(state().status).toBe('playerPaused'))
    expect(snapshots).toEqual([INITIAL_RUNTIME])

    click()

    // Opening the microphone takes a while: meanwhile the user is pending.
    await waitFor(() => expect(state().status).toBe('thinking'))
    const connecting = {
      ...INITIAL_RUNTIME,
      user: { isPending: true, rawStatus: 'idle' },
    }
    expect(runtime()).toEqual(connecting)
    expect(audioServer.find({ path: '/audio-runtimes/webrtc' })).toEqual([])

    openMicrophone()

    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)
    expect(snapshots).toEqual([INITIAL_RUNTIME, connecting, CONNECTED_RUNTIME])
    // Connected: the user is no longer pending, and the assistant is ready,
    // no longer pending, and its voice came in on the remote track.
    expect(runtime()!.user.isPending).toBe(false)
    expect(runtime()!.assistant.isReady).toBe(true)
    expect(runtime()!.assistant.isPending).toBe(false)
    expect(runtime()!.assistant.isAudioPlayed).toBe(true)
    expect(runtime()!.assistant.paused).toBe(false)
    // The assistant's voice plays on its own as it comes in.
    const [{ element }] = browser.playback.plays
    expect((element as HTMLAudioElement).autoplay).toBe(true)
  }, 60_000)

  it('mutes the microphone when stopped and unmutes it when resumed', async () => {
    const { view, state, click, peer, runtime } = await setup()
    click()
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)
    expect(runtime()).toEqual(CONNECTED_RUNTIME)
    const [track] = browser.microphone.streams[0].getTracks()

    click()

    await waitFor(() => expect(state().status).toBe('playerPaused'))
    expect(track.enabled).toBe(false)
    // Stopping pauses the assistant.
    expect(runtime()!.assistant.paused).toBe(true)
    expect(runtime()!.assistant.playing).toBe(false)
    expect(runtime()).toEqual({
      ...CONNECTED_RUNTIME,
      assistant: {
        ...CONNECTED_RUNTIME.assistant,
        playing: false,
        paused: true,
      },
    })

    click()

    await waitFor(() => expect(state().status).toBe('playing'))
    expect(track.enabled).toBe(true)
    // Resuming un-pauses the assistant.
    expect(runtime()!.assistant.paused).toBe(false)
    expect(runtime()!.assistant.playing).toBe(true)
    expect(runtime()).toEqual(CONNECTED_RUNTIME)
    expect(browser.RTCPeerConnection.instances).toHaveLength(1)
    expect(browser.playback.plays).toHaveLength(2)

    const audioElement = browser.playback.plays[0]
      .element as HTMLMediaElement & {
      srcObject: unknown
    }
    view.unmount()
    expect(peer().connectionState).toBe('closed')
    expect(audioElement.srcObject).toBeNull()
  }, 60_000)

  it('plays again when the assistant voice comes in on a new track after a pause', async () => {
    const { state, click, peer, runtime } = await setup()
    click()
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)
    click()
    await waitFor(() => expect(state().status).toBe('playerPaused'))
    const audioElement = browser.playback.plays[0]
      .element as HTMLMediaElement & { srcObject: unknown }
    const newVoice = new FakeMediaStream({ source: { level: 0 } })
    expect(runtime()!.assistant.paused).toBe(true)

    // ontrack: the remote sends the assistant's voice on a new track.
    peer().ontrack!({
      track: newVoice.getTracks()[0],
      streams: [newVoice],
    } as unknown as RTCTrackEvent)

    await waitFor(() => expect(state().status).toBe('playing'))
    // The new track un-pauses the assistant and plays.
    expect(runtime()!.assistant.paused).toBe(false)
    expect(runtime()!.assistant.playing).toBe(true)
    expect(runtime()).toEqual(CONNECTED_RUNTIME)
    expect(audioElement.srcObject).toBe(newVoice)
  }, 60_000)

  it('relays realtime events to the server and the server events back', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let assistantId = ''
    const { assistant, click, state, peer, eventRequests } = await setup({
      webrtcEvents: ({ event }) => {
        if (event.type !== 'session.created') return { chunks: [] }

        const sessionUpdate = line({
          type: 'openaiEvent',
          data: { type: 'session.update', session: { voice: 'alloy' } },
        })
        const threadCreated = line({
          type: 'threadEvent',
          data: {
            event: 'thread.created',
            data: { metadata: { assistantId, threadId: 'thread-1' } },
          },
        })

        return {
          chunks: [
            sessionUpdate.slice(0, 20),
            sessionUpdate.slice(20) + threadCreated.slice(0, 30),
            threadCreated.slice(30) + '\nnot json\n',
            line({ type: 'otherEvent', data: {} }) +
              line({
                type: 'threadEvent',
                data: { event: 'thread.message.created', data: {} },
              }),
          ],
        }
      },
    })
    assistantId = assistant.id
    click()
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)
    const [dataChannel] = peer().dataChannels

    dataChannel.receive({ type: 'session.created', session: { id: 's-1' } })

    await waitFor(() =>
      expect(dataChannel.sent.map((data) => JSON.parse(data))).toEqual([
        { type: 'session.update', session: { voice: 'alloy' } },
      ]),
    )
    await waitFor(() =>
      expect(errors).toHaveBeenCalledWith(
        'JSON parse error:',
        expect.any(SyntaxError),
        'Line:',
        'not json',
      ),
    )
    const [sessionCreated] = eventRequests()
    expect(JSON.parse(sessionCreated.body)).toEqual({
      type: 'session.created',
      session: { id: 's-1' },
    })
    expect(sessionCreated.query.get('assistantId')).toBe(assistant.id)
    expect(sessionCreated.query.get('threadId')).toBeNull()

    // Only finished responses and transcriptions go to the server.
    dataChannel.receive({ type: 'input_audio_buffer.speech_started' })
    dataChannel.receive({
      type: 'response.done',
      response: { status: 'cancelled' },
    })
    dataChannel.receive({
      type: 'response.done',
      response: { status: 'completed' },
    })
    dataChannel.receive({
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'Hi',
    })

    await waitFor(() => expect(eventRequests()).toHaveLength(3))
    const [, responseDone, transcription] = eventRequests()
    expect(JSON.parse(responseDone.body).type).toBe('response.done')
    expect(JSON.parse(transcription.body).transcript).toBe('Hi')
    // The thread created by the server is used from then on.
    expect(transcription.query.get('threadId')).toBe('thread-1')
    expect(document.cookie).toContain(
      `superinterface-${assistant.id}-threadId=thread-1`,
    )
  }, 60_000)

  it('runs client tools the server asks for and submits their outputs', async () => {
    const getWeather = vi.fn(async ({ city }: { city: string }) => ({
      city,
      temperature: 20,
    }))
    Object.assign(window, { getWeather })
    const { click, state, peer, publicKey } = await setup({
      webrtcEvents: () => ({
        chunks: [
          line({
            type: 'threadEvent',
            data: {
              event: 'thread.run.requires_action',
              data: {
                required_action: {
                  type: 'submit_client_tool_outputs',
                  submit_client_tool_outputs: {
                    tool_calls: [
                      {
                        id: 'call_1',
                        type: 'function',
                        function: {
                          name: 'getWeather',
                          arguments: '{"city":"Vilnius"}',
                        },
                      },
                    ],
                  },
                },
              },
            },
          }),
        ],
      }),
    })
    click()
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)

    peer().dataChannels[0].receive({
      type: 'response.done',
      response: { status: 'completed' },
    })

    await waitFor(() =>
      expect(
        audioServer.proxiedRequests.filter(
          ({ path }) => path === '/api/threads/runs/submit-client-tool-outputs',
        ),
      ).toHaveLength(1),
    )
    expect(getWeather).toHaveBeenCalledWith({ city: 'Vilnius' })
    const [submission] = audioServer.proxiedRequests.filter(
      ({ path }) => path === '/api/threads/runs/submit-client-tool-outputs',
    )
    expect(JSON.parse(submission.body)).toMatchObject({
      toolOutputs: [
        {
          toolCallId: 'call_1',
          output: JSON.stringify({ city: 'Vilnius', temperature: 20 }),
        },
      ],
      publicApiKey: publicKey,
    })
    // The test server answered (it has no Redis here, so it fails).
    await waitFor(() => expect(submission.status).toBeDefined(), SERVER_TIMEOUT)
    delete (window as { getWeather?: unknown }).getWeather
  }, 60_000)

  it('throws when the server answers events without a body', async () => {
    const { click, state, peer } = await setup({
      webrtcEvents: () => ({ status: 204 }),
    })
    click()
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)

    const unhandled = captureUnhandledRejections()
    try {
      peer().dataChannels[0].receive({ type: 'session.created' })
      await waitFor(() => expect(unhandled.reasons).toHaveLength(1))
    } finally {
      unhandled.restore()
    }

    expect((unhandled.reasons[0] as Error).message).toBe(
      'No body in events response',
    )
    expect(state().status).toBe('playing')
  }, 60_000)

  it('BUG: cannot retry after the server rejects the session', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { state, click, snapshots, runtime } = await setup({
      webrtcAnswer: { status: 500 },
    })

    click()

    await waitFor(() =>
      expect(errors).toHaveBeenCalledWith(
        'Error initRealtimeSession:',
        new Error('Server responded with status 500'),
      ),
    )
    await waitFor(() =>
      expect(errors).toHaveBeenCalledWith(
        'Assistant play error:',
        expect.objectContaining({ name: 'NotSupportedError' }),
      ),
    )
    await waitFor(() => expect(runtime()).toEqual(FAILED_RUNTIME))
    // The failure stops the user's side and the assistant is no longer
    // pending.
    expect(runtime()!.user.rawStatus).toBe('stopped')
    expect(runtime()!.user.isPending).toBe(false)
    expect(runtime()!.assistant.isPending).toBe(false)
    // It showed the user as pending while it tried.
    expect(snapshots).toEqual([
      INITIAL_RUNTIME,
      { ...INITIAL_RUNTIME, user: { isPending: true, rawStatus: 'idle' } },
      FAILED_RUNTIME,
    ])
    expect(state().status).toBe('playerPaused')
    expect(browser.RTCPeerConnection.instances).toHaveLength(1)

    click()
    await sleep(300)

    // BUG: the session counts as started even though it failed, so the
    // button never tries to connect again.
    expect(browser.RTCPeerConnection.instances).toHaveLength(1)
    expect(audioServer.find({ path: '/audio-runtimes/webrtc' })).toHaveLength(1)
  }, 60_000)

  it('gives up on the session when the microphone is blocked', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    browser.microphone.allow = false
    const { state, click, runtime } = await setup({
      children: (
        <AudioThread.Root>
          <AudioThread.Status />
          <AudioThread.Form />
          <RuntimeControls />
        </AudioThread.Root>
      ),
    })

    click()

    await waitFor(() =>
      expect(errors).toHaveBeenCalledWith(
        'Error initRealtimeSession:',
        expect.objectContaining({ name: 'NotAllowedError' }),
      ),
    )
    await waitFor(() => expect(runtime()).toEqual(FAILED_RUNTIME))
    expect(state().status).toBe('playerPaused')
    expect(audioServer.find({ path: '/audio-runtimes/webrtc' })).toEqual([])

    // There is no microphone stream to mute.
    fireEvent.click(
      state().buttons.find(
        ({ element }) => element.getAttribute('aria-label') === 'user pause',
      )!.element,
    )
    await waitFor(() =>
      expect(runtime()).toEqual({
        ...FAILED_RUNTIME,
        assistant: {
          ...FAILED_RUNTIME.assistant,
          playing: false,
          paused: true,
        },
      }),
    )
    expect(state().status).toBe('playerPaused')
  }, 60_000)

  it('plays without visualizations when the answer has no audio', async () => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, click, peer, runtime } = await setup({
      webrtcAnswer: { sdp: 'v=0\r\ns=-\r\n' },
    })

    click()

    await waitFor(() =>
      expect(warnings).toHaveBeenCalledWith(
        'Could not build analyzers:',
        expect.any(TypeError),
      ),
    )
    expect(peer().remoteStream).toBeNull()
    // The session is ready, but without a remote track no assistant audio
    // was ever played.
    await waitFor(() =>
      expect(runtime()).toEqual({
        ...CONNECTED_RUNTIME,
        assistant: { ...CONNECTED_RUNTIME.assistant, isAudioPlayed: false },
      }),
    )
    // Without ontrack, only the finished session set up the assistant as
    // ready and no longer pending.
    expect(runtime()!.assistant.isReady).toBe(true)
    expect(runtime()!.assistant.isPending).toBe(false)
    expect(state().status).toBe('playerPaused')
  }, 60_000)

  it('fails gracefully where WebRTC is unavailable', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { RTCPeerConnection } = globalThis
    delete (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection
    try {
      const { state, click, runtime } = await setup()

      click()

      await waitFor(() =>
        expect(errors).toHaveBeenCalledWith(
          'Error initRealtimeSession:',
          expect.any(ReferenceError),
        ),
      )
      await waitFor(() => expect(runtime()).toEqual(FAILED_RUNTIME))
      expect(state().status).toBe('playerPaused')
      expect(browser.playback.plays).toEqual([])
    } finally {
      Object.assign(globalThis, { RTCPeerConnection })
    }
  }, 60_000)

  it('un-pauses the assistant (paused: false) when assistant.play follows assistant.pause', async () => {
    const { state, click, runtime } = await setup({
      children: (
        <AudioThread.Root>
          <AudioThread.Status />
          <AudioThread.Form />
          <RuntimeControls />
        </AudioThread.Root>
      ),
    })
    const press = (label: string) =>
      fireEvent.click(
        state().buttons.find(
          ({ element }) => element.getAttribute('aria-label') === label,
        )!.element,
      )
    click()
    await waitFor(() => expect(state().status).toBe('playing'), SERVER_TIMEOUT)

    press('assistant pause')
    await waitFor(() => expect(runtime()!.assistant.paused).toBe(true))
    expect(runtime()!.assistant.playing).toBe(false)
    expect(state().status).toBe('playerPaused')

    // assistant.play (start) sets paused back to false and playing to true.
    press('assistant play')
    await waitFor(() => expect(runtime()!.assistant.playing).toBe(true))
    expect(runtime()!.assistant.paused).toBe(false)
    expect(state().status).toBe('playing')
  }, 60_000)

  it('ignores pausing before the session starts and the no-op user start', async () => {
    const { state, snapshots } = await setup({
      children: (
        <AudioThread.Root>
          <AudioThread.Status />
          <AudioThread.Form />
          <RuntimeControls />
        </AudioThread.Root>
      ),
    })
    const press = (label: string) =>
      fireEvent.click(
        state().buttons.find(
          ({ element }) => element.getAttribute('aria-label') === label,
        )!.element,
      )

    press('user start')
    press('user pause')
    press('assistant pause')
    await sleep(200)

    expect(state().status).toBe('playerPaused')
    expect(snapshots).toEqual([INITIAL_RUNTIME])
    expect(browser.RTCPeerConnection.instances).toEqual([])
    expect(browser.microphone.getUserMediaCalls).toEqual([])
  }, 60_000)
})
