import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { Theme } from '@radix-ui/themes'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { AudioThread } from '@/components/threads/AudioThread'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import type { AudioRuntime } from '@/types'
import { readAudioThreadState } from '../lib/readAudioThreadState'

// An analyser that hears `levels` (0-255): its frequency data is split into
// as many equal bands as there are levels. Change `levels` to change what it
// hears.
const analyserHearing = ({ levels }: { levels: number[] }) => {
  const analyser = {
    levels,
    // AudioThread reads 1/15 of the bins: 64 values, 16 per bar.
    frequencyBinCount: 960,
    getByteFrequencyData: (array: Uint8Array) => {
      array.forEach((_, index) => {
        array[index] =
          analyser.levels[
            Math.floor((index * analyser.levels.length) / array.length)
          ]
      })
    },
  }

  return analyser
}

type Analyser = ReturnType<typeof analyserHearing>

const createRuntime = ({
  user = {},
  assistant = {},
}: {
  user?: Partial<Omit<AudioRuntime['user'], 'visualizationAnalyser'>> & {
    visualizationAnalyser?: Analyser | null
  }
  assistant?: Partial<
    Omit<AudioRuntime['assistant'], 'visualizationAnalyser'>
  > & {
    visualizationAnalyser?: Analyser | null
  }
} = {}) =>
  ({
    user: {
      start: vi.fn(async () => {}),
      stop: vi.fn(async () => {}),
      pause: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
      visualizationAnalyser: null,
      isPending: false,
      rawStatus: 'idle',
      ...user,
    },
    assistant: {
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      visualizationAnalyser: null,
      playing: false,
      paused: false,
      isPending: false,
      isReady: true,
      isAudioPlayed: true,
      rawStatus: undefined,
      ...assistant,
    },
  }) as unknown as AudioRuntime

// Hands the test the SuperinterfaceProvider's ref to the AbortController of
// the message being created.
const AbortControllerRefProbe = ({
  onRef,
}: {
  onRef: (
    ref: ReturnType<
      typeof useSuperinterfaceContext
    >['createMessageAbortControllerRef'],
  ) => void
}) => {
  onRef(useSuperinterfaceContext().createMessageAbortControllerRef)
  return null
}

const height = ({ level }: { level: number }) => (level / 255) * 100 + 20

// An AudioThread on an audio runtime the test controls, like an app that
// brings its own.
describe('AudioThread with a custom audio runtime', () => {
  afterEach(() => {
    cleanup()
  })

  const ui = ({
    audioRuntime,
    assistantName = 'Ada',
    children,
  }: {
    audioRuntime: AudioRuntime
    assistantName?: string
    children?: React.ReactNode
  }) => (
    <Theme>
      <SuperinterfaceProvider>
        <AssistantNameContext.Provider value={assistantName}>
          <AudioThread audioRuntime={audioRuntime} />
          {children}
        </AssistantNameContext.Provider>
      </SuperinterfaceProvider>
    </Theme>
  )

  const renderThread = (args: Parameters<typeof ui>[0]) => {
    const view = render(ui(args))
    const grids = () =>
      Array.from(view.container.querySelectorAll('.rt-Grid')) as HTMLElement[]
    const bars = ({ grid }: { grid: HTMLElement }) =>
      Array.from(grid.children).map(
        (bar) => bar.firstElementChild as HTMLElement,
      )
    const barHeights = ({ grid }: { grid: HTMLElement }) =>
      bars({ grid }).map((bar) =>
        parseFloat(bar.style.getPropertyValue('--height')),
      )
    const visualizers = () => {
      const [assistant, user] = grids()
      return {
        assistant: barHeights({ grid: assistant }),
        user: barHeights({ grid: user }),
      }
    }
    const barColors = () => {
      const [assistant, user] = grids()
      return {
        assistant: bars({ grid: assistant }).map(
          (bar) => bar.style.backgroundColor,
        ),
        user: bars({ grid: user }).map((bar) => bar.style.backgroundColor),
      }
    }
    // The circle around the assistant's bars.
    const circle = () => grids()[0].parentElement as HTMLElement
    const state = () => readAudioThreadState({ container: view.container })

    return {
      view,
      rerender: (args: Parameters<typeof ui>[0]) => view.rerender(ui(args)),
      visualizers,
      barColors,
      circle,
      state,
    }
  }

  it('BarsVisualizer draws the bar heights from what each visualization analyser hears', async () => {
    const userAnalyser = analyserHearing({ levels: [0, 51, 102, 255] })
    const assistantAnalyser = analyserHearing({ levels: [255, 0, 51, 0] })
    const { visualizers, rerender } = renderThread({
      audioRuntime: createRuntime({
        user: { visualizationAnalyser: userAnalyser },
        assistant: { visualizationAnalyser: assistantAnalyser },
      }),
    })

    // Each bar is as tall as the mean level of its band, on top of 20%.
    await waitFor(() =>
      expect(visualizers()).toEqual({
        assistant: [255, 0, 51, 0].map((level) => height({ level })),
        user: [0, 51, 102, 255].map((level) => height({ level })),
      }),
    )

    // The bars keep following the audio, frame by frame.
    userAnalyser.levels = [102, 102, 0, 0]
    assistantAnalyser.levels = [0, 0, 0, 255]
    await waitFor(() =>
      expect(visualizers()).toEqual({
        assistant: [0, 0, 0, 255].map((level) => height({ level })),
        user: [102, 102, 0, 0].map((level) => height({ level })),
      }),
    )

    // Without an analyser the bars lie flat.
    rerender({
      audioRuntime: createRuntime({
        assistant: { visualizationAnalyser: assistantAnalyser },
      }),
    })
    await waitFor(() =>
      expect(visualizers()).toEqual({
        assistant: [0, 0, 0, 255].map((level) => height({ level })),
        user: [20, 20, 20, 20],
      }),
    )

    // A new analyser is drawn as soon as it is passed in.
    rerender({
      audioRuntime: createRuntime({
        user: {
          visualizationAnalyser: analyserHearing({ levels: [51, 0, 0, 51] }),
        },
        assistant: { visualizationAnalyser: assistantAnalyser },
      }),
    })
    await waitFor(() =>
      expect(visualizers().user).toEqual(
        [51, 0, 0, 51].map((level) => height({ level })),
      ),
    )
  })

  it('scales the assistant visualization with how loud the user visualization analyser hears the user', async () => {
    const userAnalyser = analyserHearing({ levels: [0, 51, 102, 255] })
    const { circle, rerender } = renderThread({
      audioRuntime: createRuntime(),
    })

    // Without an analyser the circle keeps its size.
    await waitFor(() => expect(circle().style.scale).toBe('1'))

    rerender({
      audioRuntime: createRuntime({
        user: { visualizationAnalyser: userAnalyser },
      }),
    })

    // It grows by up to a tenth with the mean level the user is heard at.
    await waitFor(() =>
      expect(circle().style.scale).toBe(String(1 + 102 / 255 / 10)),
    )

    userAnalyser.levels = [255, 255, 255, 255]
    await waitFor(() => expect(circle().style.scale).toBe('1.1'))
  })

  it('colors the microphone and the user bars with the accent color while recording', async () => {
    const audioRuntime = createRuntime({
      user: { rawStatus: 'recording' },
    })
    const { view, barColors, circle, state, rerender } = renderThread({
      audioRuntime,
    })
    const micColor = () =>
      (view.container.querySelector('svg[viewBox="0 0 384 512"]') as SVGElement)
        .style.color
    const userBarsBackground = () =>
      (
        view.container.querySelectorAll('.rt-Grid')[1]
          .parentElement as HTMLElement
      ).style.backgroundColor

    await waitFor(() => expect(state().status).toBe('recording'))
    expect(micColor()).toBe('var(--accent-11)')
    expect(userBarsBackground()).toBe('var(--accent-4)')
    expect(barColors()).toEqual({
      assistant: Array(4).fill('var(--gray-11)'),
      user: Array(4).fill('var(--accent-11)'),
    })
    expect(circle().style.backgroundColor).toBe('var(--gray-4)')

    // While the assistant speaks, its side is accented instead.
    rerender({
      audioRuntime: createRuntime({
        user: { rawStatus: 'stopped' },
        assistant: { playing: true },
      }),
    })

    await waitFor(() => expect(state().status).toBe('playing'))
    expect(micColor()).toBe('var(--gray-11)')
    expect(userBarsBackground()).toBe('var(--gray-4)')
    expect(barColors()).toEqual({
      assistant: Array(4).fill('var(--accent-11)'),
      user: Array(4).fill('var(--gray-11)'),
    })
    expect(circle().style.backgroundColor).toBe('var(--accent-4)')
  })

  it('stops the assistant, aborts the message being created and listens when the user interrupts', async () => {
    let abortControllerRef: { current: AbortController | null } = {
      current: null,
    }
    const audioRuntime = createRuntime({
      user: { rawStatus: 'stopped' },
      assistant: { playing: true },
    })
    const { state } = renderThread({
      audioRuntime,
      children: (
        <AbortControllerRefProbe
          onRef={(ref) => {
            abortControllerRef = ref
          }}
        />
      ),
    })
    const createMessageAbortController = new AbortController()
    abortControllerRef.current = createMessageAbortController
    await waitFor(() => expect(state().status).toBe('playing'))

    fireEvent.click(state().buttons[0].element)

    expect(createMessageAbortController.signal.aborted).toBe(true)
    expect(audioRuntime.assistant.stop).toHaveBeenCalledTimes(1)
    expect(audioRuntime.user.start).toHaveBeenCalledTimes(1)
    expect(audioRuntime.assistant.play).not.toHaveBeenCalled()
  })

  it('shows the assistant name from AssistantNameContext next to the visualization', () => {
    const { view } = renderThread({
      audioRuntime: createRuntime(),
      assistantName: 'Ada Lovelace',
    })

    const [name] = Array.from(view.container.querySelectorAll('.rt-Text'))
    expect(name.textContent).toBe('Ada Lovelace')
  })
})
