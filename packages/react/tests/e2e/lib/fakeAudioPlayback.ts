// jsdom's <audio> cannot load or play anything. This gives HTMLMediaElement
// the behavior of a browser that plays mp3: `load()` downloads `src` for real
// (an error response, or mp3 without `canPlayMp3`, fires `error` like an
// undecodable source), `play()`
// starts playing, and playback runs until the test calls `end()` - so tests
// decide how long the assistant speaks. Elements playing a MediaStream
// (`srcObject`, WebRTC) play without loading.

type ElementState = {
  readyState: number
  paused: boolean
  currentTime: number
  error: { code: number; message: string } | null
}

export type FakePlayback = {
  src: string
  srcObject: unknown
  element: HTMLMediaElement
}

export const createFakeAudioPlayback = () => {
  const states = new WeakMap<HTMLMediaElement, ElementState>()

  const stateOf = (element: HTMLMediaElement) => {
    let state = states.get(element)
    if (!state) {
      state = { readyState: 0, paused: true, currentTime: 0, error: null }
      states.set(element, state)
    }
    return state
  }

  const playback = {
    loads: [] as string[],
    plays: [] as FakePlayback[],
    // Makes play() reject like a browser that blocks autoplay.
    rejectPlay: false,
    // Turned off, the browser cannot play mp3 (e.g. Chromium without
    // proprietary codecs). Howler checks this once, before its first sound.
    canPlayMp3: true,

    reset() {
      playback.loads = []
      playback.plays = []
      playback.rejectPlay = false
      playback.canPlayMp3 = true
    },

    // The latest play of each element that is still playing.
    playing() {
      const latest = new Map<HTMLMediaElement, FakePlayback>()
      playback.plays.forEach((play) => latest.set(play.element, play))
      return Array.from(latest.values()).filter(
        ({ element }) => !element.paused,
      )
    },

    // Finishes everything that is playing, as when the audio runs out.
    end() {
      const playing = playback.playing()
      playing.forEach(({ element }) => {
        const state = stateOf(element)
        state.paused = true
        element.dispatchEvent(new Event('pause'))
        element.dispatchEvent(new Event('ended'))
      })
      return playing
    },
  }

  const isPlayableSrc = (src: string) => !!src && !src.startsWith('data:')

  const install = () => {
    const prototype = window.HTMLMediaElement.prototype

    Object.defineProperties(prototype, {
      readyState: {
        configurable: true,
        get(this: HTMLMediaElement) {
          return stateOf(this).readyState
        },
      },
      paused: {
        configurable: true,
        get(this: HTMLMediaElement) {
          return stateOf(this).paused
        },
      },
      currentTime: {
        configurable: true,
        get(this: HTMLMediaElement) {
          return stateOf(this).currentTime
        },
        set(this: HTMLMediaElement, value: number) {
          stateOf(this).currentTime = value
        },
      },
      duration: {
        configurable: true,
        get(this: HTMLMediaElement) {
          return stateOf(this).readyState > 0 ? 1 : NaN
        },
      },
      error: {
        configurable: true,
        get(this: HTMLMediaElement) {
          return stateOf(this).error
        },
      },
    })

    prototype.canPlayType = (type: string) =>
      playback.canPlayMp3 && /audio\/(mpeg|mp3)/.test(type) ? 'probably' : ''

    prototype.load = function (this: HTMLMediaElement) {
      const state = stateOf(this)
      const src = this.src
      state.readyState = 0
      state.error = null

      if (!isPlayableSrc(src)) return
      playback.loads.push(src)

      fetch(src)
        .then(async (response) => {
          await response.arrayBuffer()
          if (this.src !== src) return

          if (!response.ok || !playback.canPlayMp3) {
            state.error = {
              code: 4,
              message: `MEDIA_ERR_SRC_NOT_SUPPORTED (${response.status})`,
            }
            this.dispatchEvent(new Event('error'))
            return
          }

          state.readyState = 4
          this.dispatchEvent(new Event('loadedmetadata'))
          this.dispatchEvent(new Event('canplay'))
          this.dispatchEvent(new Event('canplaythrough'))
        })
        .catch(() => {})
    }

    prototype.play = function (this: HTMLMediaElement) {
      if (playback.rejectPlay) {
        return Promise.reject(
          new DOMException('play() failed', 'NotAllowedError'),
        )
      }

      const srcObject = (this as { srcObject?: unknown }).srcObject ?? null
      if (!isPlayableSrc(this.src) && !srcObject) {
        return Promise.reject(
          new DOMException(
            'The element has no supported sources.',
            'NotSupportedError',
          ),
        )
      }

      const state = stateOf(this)
      state.paused = false
      playback.plays.push({ src: this.src, srcObject, element: this })
      this.dispatchEvent(new Event('play'))
      this.dispatchEvent(new Event('playing'))
      return Promise.resolve()
    }

    prototype.pause = function (this: HTMLMediaElement) {
      const state = stateOf(this)
      if (state.paused) return
      state.paused = true
      this.dispatchEvent(new Event('pause'))
    }
  }

  return { playback, install }
}

export type FakeAudioPlaybackController = ReturnType<
  typeof createFakeAudioPlayback
>['playback']
