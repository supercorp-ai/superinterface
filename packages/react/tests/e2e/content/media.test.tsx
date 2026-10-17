import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  EnterFullScreenIcon,
  ExitFullScreenIcon,
  PauseIcon,
  PlayIcon,
  SpeakerModerateIcon,
  SpeakerOffIcon,
} from '@radix-ui/react-icons'
import { Thread } from '@/components/threads/Thread'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createOpenaiAssistantsTestAssistant } from '../lib/createOpenaiAssistantsTestAssistant'
import { emulateMediaBrowserApis } from '../lib/emulateMediaBrowserApis'
import { loadMedia } from '../lib/loadMedia'
import { renderAssistantReply } from '../lib/renderAssistantReply'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { startFakeAssistantsApi } from '../lib/startFakeAssistantsApi'
import { submitThreadMessage } from '../lib/submitThreadMessage'

// Vidstack reads whether fullscreen is supported when it is imported.
vi.hoisted(() => {
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    value: true,
  })
})

let restoreBrowserApis: () => void

beforeAll(() => {
  restoreBrowserApis = emulateMediaBrowserApis()
})

afterAll(() => {
  restoreBrowserApis()
})

const iconPath = ({ icon }: { icon: React.ReactElement }) =>
  new DOMParser()
    .parseFromString(renderToStaticMarkup(icon), 'image/svg+xml')
    .querySelector('path')!
    .getAttribute('d')

const buttonIcon = ({ button }: { button: Element }) =>
  button.querySelector('path')!.getAttribute('d')

const mediaReply = [
  'Media:',
  '',
  '![Clip](https://example.com/clip.mp4)',
  '',
  '![Song](https://example.com/song.wav)',
  '',
  '![Podcast](https://example.com/podcast.mp3)',
  '',
  '![Odd file](https://example.com/file.)',
  '',
  '![Missing]()',
].join('\n')

describe('media in replies', () => {
  let close: () => Promise<void>

  afterEach(async () => {
    cleanup()
    await close()
  })

  const renderMediaReply = async () => {
    const fakeLlm = await startFakeLlm({ replies: [{ content: mediaReply }] })
    close = fakeLlm.close

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Media:',
    })

    const video = await waitFor(() => document.querySelector('video')!)

    return {
      video,
      player: video.closest('[data-media-player]')!,
    }
  }

  it('plays videos and audio, and shows other files as images', async () => {
    await renderMediaReply()

    expect(document.querySelector('video source')?.getAttribute('src')).toBe(
      'https://example.com/clip.mp4',
    )
    expect(document.querySelector('video source')?.getAttribute('type')).toBe(
      'video/mp4',
    )
    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll('audio source')).map(
          (source) =>
            `${source.getAttribute('type')} ${source.getAttribute('src')}`,
        ),
      ).toEqual([
        'audio/wav https://example.com/song.wav',
        'audio/mp3 https://example.com/podcast.mp3',
      ]),
    )

    expect(
      screen.getByRole('img', { name: 'Odd file' }).getAttribute('src'),
    ).toBe('https://example.com/file.')
    expect(
      screen.getByRole('img', { name: 'Missing' }).hasAttribute('src'),
    ).toBe(false)
  }, 30_000)

  it('plays, mutes, seeks and goes fullscreen with the video controls', async () => {
    const { video, player } = await renderMediaReply()
    const button = ({ tooltip }: { tooltip: string }) =>
      player.querySelector(`[data-media-tooltip="${tooltip}"]`)!
    const press = ({ tooltip }: { tooltip: string }) =>
      fireEvent.keyDown(button({ tooltip }), { key: 'Enter' })
    const seekSlider = player.querySelector('[role="slider"]')!

    // The controls sit above the video.
    const controls = player.querySelector('.superinterface-video-controls')!
    expect((controls as HTMLElement).style.zIndex).toBe('10')

    loadMedia({ media: video, duration: 120 })
    await waitFor(() => expect(player.hasAttribute('data-can-play')).toBe(true))
    expect(seekSlider.hasAttribute('data-disabled')).toBe(false)

    expect(buttonIcon({ button: button({ tooltip: 'play' }) })).toBe(
      iconPath({ icon: <PlayIcon /> }),
    )
    press({ tooltip: 'play' })
    await waitFor(() =>
      expect(buttonIcon({ button: button({ tooltip: 'play' }) })).toBe(
        iconPath({ icon: <PauseIcon /> }),
      ),
    )
    press({ tooltip: 'play' })
    await waitFor(() =>
      expect(buttonIcon({ button: button({ tooltip: 'play' }) })).toBe(
        iconPath({ icon: <PlayIcon /> }),
      ),
    )

    expect(buttonIcon({ button: button({ tooltip: 'mute' }) })).toBe(
      iconPath({ icon: <SpeakerModerateIcon /> }),
    )
    press({ tooltip: 'mute' })
    await waitFor(() =>
      expect(buttonIcon({ button: button({ tooltip: 'mute' }) })).toBe(
        iconPath({ icon: <SpeakerOffIcon /> }),
      ),
    )
    expect(video.muted).toBe(true)
    press({ tooltip: 'mute' })
    await waitFor(() =>
      expect(buttonIcon({ button: button({ tooltip: 'mute' }) })).toBe(
        iconPath({ icon: <SpeakerModerateIcon /> }),
      ),
    )

    // Turning the volume all the way down shows the muted speaker too.
    fireEvent.focus(button({ tooltip: 'mute' }))
    const volume = await waitFor(
      () => {
        const slider = document.querySelector(
          '[role="slider"][aria-orientation="vertical"]',
        )
        expect(slider).toBeTruthy()
        return slider!
      },
      { timeout: 5_000 },
    )
    expect(volume.getAttribute('aria-valuenow')).toBe('100')
    fireEvent.keyDown(volume, { key: 'Home' })
    await waitFor(() => expect(video.volume).toBe(0))
    await waitFor(() =>
      expect(buttonIcon({ button: button({ tooltip: 'mute' }) })).toBe(
        iconPath({ icon: <SpeakerOffIcon /> }),
      ),
    )
    expect(video.muted).toBe(false)

    // The time slider follows the playback, and seeks when moved.
    video.currentTime = 60
    await waitFor(() =>
      expect(seekSlider.getAttribute('aria-valuenow')).toBe('50'),
    )
    fireEvent.keyDown(seekSlider, { key: 'End' })
    await waitFor(() => expect(video.currentTime).toBe(120))
    expect(seekSlider.getAttribute('aria-valuenow')).toBe('100')

    // Dragging the time slider marks the player as seeking until the drag
    // ends. jsdom lays nothing out, so a press on the track is at its start.
    const pointerCapture = {
      setPointerCapture: () => {},
      hasPointerCapture: () => true,
      releasePointerCapture: () => {},
    }
    Object.assign(Element.prototype, pointerCapture)
    try {
      const track = seekSlider.closest('.rt-SliderRoot')!
      fireEvent.pointerDown(track, { pointerId: 1 })
      await waitFor(() =>
        expect(player.hasAttribute('data-seeking')).toBe(true),
      )
      expect(seekSlider.getAttribute('aria-valuenow')).toBe('0')
      expect(video.currentTime).toBe(120)
      fireEvent.pointerUp(track, { pointerId: 1 })
      await waitFor(() => expect(video.currentTime).toBe(0))
      await waitFor(() =>
        expect(player.hasAttribute('data-seeking')).toBe(false),
      )
    } finally {
      Object.keys(pointerCapture).forEach((key) => {
        delete (Element.prototype as unknown as Record<string, unknown>)[key]
      })
    }

    expect(buttonIcon({ button: button({ tooltip: 'fullscreen' }) })).toBe(
      iconPath({ icon: <EnterFullScreenIcon /> }),
    )
    press({ tooltip: 'fullscreen' })
    await waitFor(() =>
      expect(buttonIcon({ button: button({ tooltip: 'fullscreen' }) })).toBe(
        iconPath({ icon: <ExitFullScreenIcon /> }),
      ),
    )
  }, 30_000)

  it('disables the time slider for a live stream, which cannot seek', async () => {
    const { video, player } = await renderMediaReply()
    const seekSlider = player.querySelector('[role="slider"]')!
    expect(seekSlider.hasAttribute('data-disabled')).toBe(false)

    loadMedia({ media: video, duration: Infinity })
    await waitFor(() => expect(player.hasAttribute('data-can-play')).toBe(true))
    await waitFor(() =>
      expect(seekSlider.hasAttribute('data-disabled')).toBe(true),
    )
  }, 30_000)
})

describe('annotated media in replies', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeAssistantsApi>>

  afterEach(async () => {
    cleanup()
    await fakeApi.close()
  })

  // BUG: the media type of a video from a file annotation is taken from the
  // file contents URL it is rewritten to (`video/1:<port>/api/files/...`),
  // not from the file name, so no player can load it and nothing plays.
  it('BUG: cannot play videos from file annotations', async () => {
    const text = 'Demo:\n\n![Demo](sandbox:/mnt/data/demo.mp4)'
    const start = text.indexOf('sandbox:')
    fakeApi = await startFakeAssistantsApi({
      replies: [
        {
          text,
          annotations: [
            {
              type: 'file_path',
              text: 'sandbox:/mnt/data/demo.mp4',
              start_index: start,
              end_index: start + 'sandbox:/mnt/data/demo.mp4'.length,
              file_path: { file_id: 'cfile-demo', container_id: 'cntr_1' },
            },
          ],
        },
      ],
    })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })
    await submitThreadMessage({ content: 'Show the demo' })
    await screen.findByText('Demo:', {}, { timeout: 15_000 })

    const player = await waitFor(
      () => document.querySelector('[data-media-player]')!,
    )
    await waitFor(() =>
      expect(player.getAttribute('data-media-type')).toBe('unknown'),
    )
    expect(player.getAttribute('aria-label')).toBe('Media Player')
    expect(player.querySelector('video')).toBeNull()
  }, 30_000)
})
