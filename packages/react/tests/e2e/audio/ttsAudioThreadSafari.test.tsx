import { afterEach, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { cleanup, configure, fireEvent, waitFor } from '@testing-library/react'
import { AudioThread } from '@/components/threads/AudioThread'
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

// The browser is detected once, when the audio hooks load, so it has to say
// it is Safari before anything is imported.
vi.hoisted(() => {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  })
})

// Safari's <audio> cannot feed Web Audio across origins, so there the
// speech is downloaded and played through Web Audio instead.
describe('AudioThread with the TTS audio runtime in Safari', () => {
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

  afterEach(async () => {
    cleanup()
    await audioServer.idle()
    await Promise.all([fakeLlm.close(), audioServer.close()])
  })

  it('plays the speech through Web Audio', async () => {
    browser.reset()
    browser.AudioContext.decodedDuration = 0.3
    fakeLlm = await startFakeLlm()
    audioServer = await startFakeAudioRuntimeServer({
      upstreamBaseUrl: inject('testServer').baseUrl,
    })
    const { assistant, privateKey, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    await setTestInitialMessages({
      privateKey,
      assistantId: assistant.id,
      initialMessages: [{ role: 'ASSISTANT', content: 'Hello!' }],
    })

    const view = renderWithSuperinterfaceBaseUrl({
      baseUrl: audioServer.apiBaseUrl,
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <AudioThread />,
    })
    const state = () => readAudioThreadState({ container: view.container })

    await waitFor(
      () =>
        expect(
          audioServer
            .find({ path: '/audio-runtimes/tts' })
            .map(({ query }) => query.get('input')),
        ).toEqual(['Hello!']),
      { timeout: 15_000 },
    )
    await waitFor(() => expect(state().status).toBe('playerPaused'))

    fireEvent.click(state().buttons[0].element)

    await waitFor(() => expect(state().status).toBe('playing'))
    // It finishes on its own once the decoded audio has played.
    await waitFor(() => expect(state().status).toBe('idle'))
    expect(browser.playback.loads).toEqual([])
    expect(browser.playback.plays).toEqual([])
  }, 60_000)
})
