import { afterEach, beforeAll, describe, expect, inject, it } from 'vitest'
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The speech is always mp3. Howler checks the browser's codecs once, before
// its first sound, so this runs in a file of its own.
describe('AudioThread with the TTS audio runtime in a browser without mp3', () => {
  let browser: FakeAudioBrowser
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let audioServer: Awaited<ReturnType<typeof startFakeAudioRuntimeServer>>

  beforeAll(() => {
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

  it('BUG: silently never speaks or listens', async () => {
    browser.reset()
    browser.playback.canPlayMp3 = false
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

    await waitFor(() =>
      expect(
        audioServer.proxiedRequests.filter(
          ({ path, status }) => path === '/api/messages' && status,
        ),
      ).toHaveLength(1),
    )
    await sleep(300)
    fireEvent.click(state().buttons[0].element)
    await sleep(500)

    // BUG: the speech can never play, nothing says so, and recording only
    // starts after the assistant has spoken.
    expect(
      browser.playback.loads.map((src) =>
        new URL(src).searchParams.get('input'),
      ),
    ).toEqual(['Hello!'])
    expect(browser.playback.plays).toEqual([])
    expect(state().status).toBe('playerPaused')
    expect(browser.microphone.getUserMediaCalls).toEqual([])
  }, 60_000)
})
