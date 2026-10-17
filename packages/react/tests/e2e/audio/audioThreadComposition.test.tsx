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
import { AudioThreadDialog } from '@/components/threads/AudioThreadDialog'
import { TtsAudioRuntimeProvider } from '@/components/audioRuntimes/TtsAudioRuntimeProvider'
import type { PlayArgs } from '@/types'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { setTestInitialMessages } from '../lib/setTestInitialMessages'
import { startFakeAudioRuntimeServer } from '../lib/startFakeAudioRuntimeServer'
import { renderWithSuperinterfaceBaseUrl } from '../lib/renderWithSuperinterfaceBaseUrl'
import { readAudioThreadState } from '../lib/readAudioThreadState'
import {
  installFakeAudioBrowser,
  type FakeAudioBrowser,
} from '../lib/installFakeAudioBrowser'

const SERVER_TIMEOUT = { timeout: 15_000 }

describe('AudioThread composition', () => {
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
    audioServer = await startFakeAudioRuntimeServer({
      upstreamBaseUrl: inject('testServer').baseUrl,
    })
  })

  afterEach(async () => {
    cleanup()
    await audioServer.idle()
    await Promise.all([fakeLlm.close(), audioServer.close()])
  })

  const render = async ({ children }: { children: React.ReactNode }) => {
    const { assistant, privateKey, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await setTestInitialMessages({
      privateKey,
      assistantId: assistant.id,
      initialMessages: [{ role: 'ASSISTANT', content: 'Hello!' }],
    })

    return renderWithSuperinterfaceBaseUrl({
      baseUrl: audioServer.apiBaseUrl,
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children,
    })
  }

  it('opens an audio thread from the dialog trigger', async () => {
    const view = await render({ children: <AudioThreadDialog /> })

    expect(view.container.querySelector('.status-messages-texts')).toBeNull()
    expect(browser.playback.loads).toEqual([])

    fireEvent.click(view.container.querySelector('button')!)

    await waitFor(
      () => expect(browser.playback.loads).toHaveLength(1),
      SERVER_TIMEOUT,
    )
    expect(readAudioThreadState({ container: view.container }).status).toBe(
      'playerPaused',
    )
    expect(new URL(browser.playback.loads[0]).searchParams.get('input')).toBe(
      'Hello!',
    )
  }, 60_000)

  it('uses the audio runtime of a surrounding TtsAudioRuntimeProvider', async () => {
    const providerOnEnd = vi.fn()
    const providerPlay = vi.fn(({ onPlay, onEnd }: PlayArgs) => {
      onPlay()
      onEnd()
    })
    const threadPlay = vi.fn()

    const view = await render({
      children: (
        <TtsAudioRuntimeProvider
          play={providerPlay}
          onEnd={providerOnEnd}
        >
          <AudioThread
            play={threadPlay}
            className="custom-audio-thread"
            style={{ maxWidth: '321px' }}
          />
        </TtsAudioRuntimeProvider>
      ),
    })

    await waitFor(
      () => expect(providerOnEnd).toHaveBeenCalledTimes(1),
      SERVER_TIMEOUT,
    )
    expect(providerPlay.mock.calls.map(([{ input }]) => input)).toEqual([
      'Hello!',
    ])
    // The thread's own play is ignored once a runtime is provided.
    expect(threadPlay).not.toHaveBeenCalled()

    const content = view.container.querySelector(
      '.custom-audio-thread',
    ) as HTMLElement
    expect(content.style.maxWidth).toBe('321px')
    await waitFor(() =>
      expect(readAudioThreadState({ container: view.container }).status).toBe(
        'idle',
      ),
    )
  }, 60_000)

  it('sizes a custom assistant visualization', async () => {
    const view = await render({
      children: (
        <AudioThread.Root>
          <AudioThread.Visualization.Root>
            <AudioThread.Visualization.AssistantVisualization.Root
              height="120px"
              width="140px"
              style={{ outline: '1px solid red' }}
            >
              <AudioThread.Visualization.AssistantVisualization.BarsVisualizer
                height="30px"
                barWidth="8px"
              />
            </AudioThread.Visualization.AssistantVisualization.Root>
            <AudioThread.Visualization.AssistantInfo />
          </AudioThread.Visualization.Root>
          <AudioThread.Status />
          <AudioThread.Form />
        </AudioThread.Root>
      ),
    })

    await waitFor(
      () => expect(browser.playback.loads).toHaveLength(1),
      SERVER_TIMEOUT,
    )
    const [assistantBars] = Array.from(
      view.container.querySelectorAll('.rt-Grid'),
    )
    const circle = assistantBars.parentElement as HTMLElement
    expect(circle.style.getPropertyValue('--height')).toBe('120px')
    expect(circle.style.getPropertyValue('--width')).toBe('140px')
    expect(circle.style.outline).toBe('1px solid red')
    // BUG: the passed style replaces the whole style instead of being merged
    // into it, so the circle loses its background and pulsing scale.
    expect(circle.style.backgroundColor).toBe('')
    expect(circle.style.scale).toBe('')

    const bar = assistantBars.firstElementChild as HTMLElement
    expect(bar.style.getPropertyValue('--height')).toBe('30px')
    expect(
      (bar.firstElementChild as HTMLElement).style.getPropertyValue('--width'),
    ).toBe('8px')
    // The assistant info shows the name once the assistant has loaded.
    await waitFor(
      () => expect(view.container.textContent).toContain('E2E Assistant'),
      SERVER_TIMEOUT,
    )
  }, 60_000)
})
