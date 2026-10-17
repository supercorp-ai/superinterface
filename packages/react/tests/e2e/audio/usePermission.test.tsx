import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { useLayoutEffect, useMemo, useState } from 'react'
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react'
import { usePermission } from '@/hooks/misc/usePermission'
import {
  installFakeAudioBrowser,
  type FakeAudioBrowser,
} from '../lib/installFakeAudioBrowser'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('usePermission', () => {
  let browser: FakeAudioBrowser

  beforeAll(() => {
    browser = installFakeAudioBrowser()
  })

  beforeEach(() => {
    browser.reset()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  const microphone = { name: 'microphone' } as const

  it('reports the permission state once queried and follows its changes', async () => {
    const { result } = renderHook(() => usePermission(microphone))
    expect(result.current).toBe('')

    await waitFor(() => expect(result.current).toBe('prompt'))
    expect(browser.microphone.permissionQueries).toBe(1)

    act(() => {
      browser.microphone.permissionStatus.change({ state: 'granted' })
    })
    expect(result.current).toBe('granted')

    act(() => {
      browser.microphone.permissionStatus.change({ state: 'denied' })
    })
    expect(result.current).toBe('denied')
  })

  it('stops listening for permission changes when unmounted', async () => {
    const { permissionStatus } = browser.microphone
    const addEventListener = vi.spyOn(permissionStatus, 'addEventListener')
    const removeEventListener = vi.spyOn(
      permissionStatus,
      'removeEventListener',
    )
    const { result, unmount } = renderHook(() => usePermission(microphone))
    await waitFor(() => expect(result.current).toBe('prompt'))
    expect(addEventListener).toHaveBeenCalledTimes(1)
    expect(addEventListener.mock.calls[0][0]).toBe('change')
    expect(removeEventListener).not.toHaveBeenCalled()

    unmount()

    expect(removeEventListener.mock.calls).toEqual(addEventListener.mock.calls)
  })

  it('ignores the answer and the changes of a permission it no longer asks about', async () => {
    const { result, rerender } = renderHook(
      ({ descriptor }: { descriptor: PermissionDescriptor }) =>
        usePermission(descriptor),
      { initialProps: { descriptor: microphone } },
    )

    // Before the microphone query answers, it asks about the camera instead,
    // which this browser cannot query.
    rerender({ descriptor: { name: 'camera' as PermissionName } })
    await waitFor(() => expect(browser.microphone.permissionQueries).toBe(2))
    await sleep(50)

    expect(result.current).toBe('')

    act(() => {
      browser.microphone.permissionStatus.change({ state: 'granted' })
    })
    expect(result.current).toBe('')
  })

  describe('when it asks again right as an answer arrives', () => {
    beforeAll(() => {
      // The answer and the re-render race outside act(), as in a browser.
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
    })

    afterAll(() => {
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    })

    // Controls, from outside React, when the harness asks again (with a new
    // descriptor, as the TTS runtime does on every render) and re-renders,
    // and what happens in the commit of each round.
    const harness = {
      askAgain: () => {},
      rerender: () => {},
      onCommit: (_args: { round: number }) => {},
    }

    const Harness = () => {
      const [round, setRound] = useState(0)
      const [, setRenders] = useState(0)
      harness.askAgain = () => setRound((current) => current + 1)
      harness.rerender = () => setRenders((current) => current + 1)
      const descriptor = useMemo(
        () => ({ name: 'microphone' as const, round }),
        [round],
      )
      const state = usePermission(descriptor)

      useLayoutEffect(() => {
        harness.onCommit({ round })
      }, [round])

      return <output>{state}</output>
    }

    it('BUG: reads an answer that arrives as it asks again as an empty state', async () => {
      const answers: ((status: PermissionStatus) => void)[] = []
      vi.spyOn(browser.microphone.permissions, 'query').mockImplementation(
        () =>
          new Promise((resolve) => {
            answers.push(resolve as (status: PermissionStatus) => void)
          }) as never,
      )
      const { permissionStatus } = browser.microphone
      const status = permissionStatus as unknown as PermissionStatus
      const view = render(<Harness />)
      const output = () => view.container.querySelector('output')!.textContent

      answers[0](status)
      await waitFor(() => expect(output()).toBe('prompt'))

      // It asks again; meanwhile the user allows the microphone.
      harness.askAgain()
      await waitFor(() => expect(answers).toHaveLength(2))
      permissionStatus.state = 'granted'

      // It asks once more, and the second answer arrives right after that
      // commit, while the component has another render queued.
      harness.onCommit = ({ round }) => {
        if (round !== 2) return
        queueMicrotask(harness.rerender)
        answers[1](status)
      }
      harness.askAgain()
      await waitFor(() => expect(answers).toHaveLength(3))
      await sleep(50)

      // BUG: onChange queues setState(() => permissionStatus?.state ?? ''),
      // which runs only in the next render, after the effect's cleanup set
      // permissionStatus = null, so the permission reads as '' although it
      // is 'granted'.
      expect(output()).toBe('')

      answers[2](status)
      await waitFor(() => expect(output()).toBe('granted'))
    })
  })
})
