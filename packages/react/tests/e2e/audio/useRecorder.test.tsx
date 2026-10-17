import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useRecorder } from '@/hooks/audioThreads/useRecorder'
import {
  installFakeAudioBrowser,
  type FakeAudioBrowser,
} from '../lib/installFakeAudioBrowser'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The TTS runtime, the only user of useRecorder, always stops on silence and
// passes onStart/onStop, so no component reaches the hook's other options:
// they are covered on the hook itself.
describe('useRecorder without stopping on silence or callbacks', () => {
  let browser: FakeAudioBrowser

  beforeAll(() => {
    browser = installFakeAudioBrowser()
  })

  beforeEach(() => {
    browser.reset()
  })

  it('keeps recording through silence until stopped', async () => {
    const { result } = renderHook(() => useRecorder({ isStopOnSilence: false }))

    await act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('recording'))
    await waitFor(() =>
      expect(result.current.visualizationAnalyser).not.toBeNull(),
    )

    browser.microphone.speak()
    await sleep(300)
    browser.microphone.silence()
    await sleep(2_000)

    expect(result.current.status).toBe('recording')
    expect(browser.MediaRecorder.instances[0].state).toBe('recording')

    await act(() => result.current.stop())

    await waitFor(() => expect(result.current.status).toBe('stopped'))
  }, 10_000)
})

// How the TTS runtime records: it stops by itself once the user has spoken
// and then gone quiet for 1.5 seconds.
describe('useRecorder stopping on silence', () => {
  let browser: FakeAudioBrowser

  beforeAll(() => {
    browser = installFakeAudioBrowser()
  })

  beforeEach(() => {
    browser.reset()
  })

  const record = async ({
    onStop = vi.fn(async () => {}),
  }: {
    onStop?: (...args: unknown[]) => Promise<void>
  } = {}) => {
    const onStart = vi.fn(async () => {})
    const hook = renderHook(() =>
      useRecorder({ isStopOnSilence: true, onStart, onStop }),
    )

    await act(() => hook.result.current.start())
    await waitFor(() => expect(hook.result.current.status).toBe('recording'))

    return { ...hook, onStart, onStop }
  }

  const sayHello = async () => {
    browser.microphone.speak()
    await sleep(300)
    browser.microphone.silence()
  }

  it('stops on its own once the user has been silent for 1.5 s after speaking', async () => {
    const { result, onStart, onStop } = await record()
    expect(onStart).toHaveBeenCalledTimes(1)

    // Silence before the user has said anything never stops it.
    await sleep(2_000)
    expect(result.current.status).toBe('recording')
    expect(onStop).not.toHaveBeenCalled()

    await sayHello()
    const quietAt = Date.now()

    await waitFor(() => expect(result.current.status).toBe('stopped'), {
      timeout: 3_000,
    })
    expect(Date.now() - quietAt).toBeGreaterThanOrEqual(1_500)
    expect(onStop).toHaveBeenCalledTimes(1)
    expect(browser.MediaRecorder.instances.map(({ state }) => state)).toEqual([
      'inactive',
    ])
  }, 10_000)

  it('hears a background hum below -60 dB as silence', async () => {
    const { result } = await record()

    await sayHello()
    browser.microphone.hum = -70

    // The visualization still shows the hum...
    const analyser = result.current.visualizationAnalyser!
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(frequencyData)
    expect(frequencyData[0]).toBe(Math.round((30 / 70) * 255))

    // ...but it does not keep the recording going.
    await waitFor(() => expect(result.current.status).toBe('stopped'), {
      timeout: 3_000,
    })
  }, 10_000)

  it('keeps recording through a hum above -60 dB', async () => {
    const { result, onStop } = await record()

    await sayHello()
    browser.microphone.hum = -50
    await sleep(2_000)

    expect(result.current.status).toBe('recording')
    expect(onStop).not.toHaveBeenCalled()
  }, 10_000)

  it('forgets the noise heard while paused when resumed, so the silence after does not stop it', async () => {
    const { result, onStop } = await record()

    await act(() => result.current.pause())
    await waitFor(() => expect(result.current.status).toBe('paused'))
    // The microphone stays open while paused, so this is heard as noise
    // (noiseStart), and the silence after it starts the silence clock.
    await sayHello()
    await sleep(2_000)
    expect(result.current.status).toBe('paused')

    // onResume clears the noise heard while paused (setNoiseStart(null)).
    await act(() => result.current.resume())
    await waitFor(() => expect(result.current.status).toBe('recording'))

    // The user has said nothing since resuming, so the 1.5 s of silence that
    // follow do not stop the recording.
    await sleep(2_000)
    expect(result.current.status).toBe('recording')
    expect(onStop).not.toHaveBeenCalled()

    await sayHello()
    await waitFor(() => expect(result.current.status).toBe('stopped'), {
      timeout: 3_000,
    })
    expect(onStop).toHaveBeenCalledTimes(1)
  }, 15_000)

  it('listens afresh when started again while the last recording is still being handled', async () => {
    // Sending the recording never finishes.
    const onStop = vi.fn(() => new Promise<void>(() => {}))
    const { result, onStart } = await record({ onStop })

    await sayHello()
    await act(() => result.current.stop())
    await waitFor(() => expect(result.current.status).toBe('stopped'))
    expect(onStop).toHaveBeenCalledTimes(1)

    await act(() => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('recording'))
    expect(onStart).toHaveBeenCalledTimes(2)

    // What the user said before does not count: the new recording waits for
    // them to speak.
    await sleep(2_000)
    expect(result.current.status).toBe('recording')
    expect(browser.MediaRecorder.instances.map(({ state }) => state)).toEqual([
      'inactive',
      'recording',
    ])
  }, 10_000)
})
