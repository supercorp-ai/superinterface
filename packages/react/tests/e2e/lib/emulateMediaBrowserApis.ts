import { emulateIntersectionObserver } from './emulateIntersectionObserver'

// The media players (Vidstack, Radix sliders) need browser APIs that the e2e
// jsdom environment lacks or breaks. This fills them in as a browser would
// behave for a page that lays nothing out, and returns a function that
// restores jsdom. Vidstack checks for fullscreen support when it is first
// imported, so define `document.fullscreenEnabled` (in `vi.hoisted`) before
// importing it:
// - jsdom's addEventListener only accepts jsdom's AbortSignal, but the e2e
//   environment keeps Node's AbortController (for Node's fetch), so Node's
//   signals are accepted too, removing the listener on abort.
// - ResizeObserver never reports sizes.
// - IntersectionObserver reports every element as visible.
// - matchMedia matches no media query.
// - Media elements can play every media type, and play, pause, change their
//   volume, seek and go fullscreen as a browser's would, firing the same
//   events (jsdom does not implement media playback).
const acceptingNodeSignals = ({
  addEventListener,
}: {
  addEventListener: EventTarget['addEventListener']
}) =>
  function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (typeof options !== 'object' || !options.signal) {
      return addEventListener.call(this, type, listener, options)
    }

    const { signal, ...rest } = options
    if (signal.aborted) return

    addEventListener.call(this, type, listener, rest)
    signal.addEventListener(
      'abort',
      () => this.removeEventListener(type, listener, rest),
      { once: true },
    )
  }

export const emulateMediaBrowserApis = () => {
  const prototypeAddEventListener = EventTarget.prototype.addEventListener
  // Vitest wraps window's own addEventListener.
  const windowAddEventListener = window.addEventListener
  const { ResizeObserver, matchMedia } = window
  const mediaPrototype = HTMLMediaElement.prototype
  const mediaDescriptors = Object.getOwnPropertyDescriptors(mediaPrototype)
  const { requestFullscreen } = Element.prototype
  const { exitFullscreen } = document
  const fullscreenDescriptors = {
    fullscreenEnabled: Object.getOwnPropertyDescriptor(
      document,
      'fullscreenEnabled',
    ),
    fullscreenElement: Object.getOwnPropertyDescriptor(
      document,
      'fullscreenElement',
    ),
  }

  EventTarget.prototype.addEventListener = acceptingNodeSignals({
    addEventListener: prototypeAddEventListener,
  })
  window.addEventListener = acceptingNodeSignals({
    addEventListener: windowAddEventListener,
  })

  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  const restoreIntersectionObserver = emulateIntersectionObserver()

  const fire = ({
    target,
    types,
    bubbles = false,
  }: {
    target: EventTarget
    types: string[]
    bubbles?: boolean
  }) =>
    types.forEach((type) => target.dispatchEvent(new Event(type, { bubbles })))
  const setState = ({
    media,
    state,
  }: {
    media: HTMLMediaElement
    state: Record<string, unknown>
  }) =>
    Object.entries(state).forEach(([key, value]) =>
      Object.defineProperty(media, key, { value, configurable: true }),
    )

  Object.defineProperties(mediaPrototype, {
    canPlayType: { configurable: true, value: () => 'probably' },
    load: { configurable: true, value: () => {} },
    play: {
      configurable: true,
      value(this: HTMLMediaElement) {
        setState({ media: this, state: { paused: false } })
        fire({ target: this, types: ['play', 'playing'] })
        return Promise.resolve()
      },
    },
    pause: {
      configurable: true,
      value(this: HTMLMediaElement) {
        setState({ media: this, state: { paused: true } })
        fire({ target: this, types: ['pause'] })
      },
    },
    muted: {
      configurable: true,
      get(this: HTMLMediaElement) {
        return mediaDescriptors.muted.get!.call(this)
      },
      set(this: HTMLMediaElement, value: boolean) {
        mediaDescriptors.muted.set!.call(this, value)
        fire({ target: this, types: ['volumechange'] })
      },
    },
    volume: {
      configurable: true,
      get(this: HTMLMediaElement) {
        return mediaDescriptors.volume.get!.call(this)
      },
      set(this: HTMLMediaElement, value: number) {
        mediaDescriptors.volume.set!.call(this, value)
        fire({ target: this, types: ['volumechange'] })
      },
    },
    currentTime: {
      configurable: true,
      get(this: HTMLMediaElement & { emulatedCurrentTime?: number }) {
        return this.emulatedCurrentTime ?? 0
      },
      set(
        this: HTMLMediaElement & { emulatedCurrentTime?: number },
        value: number,
      ) {
        this.emulatedCurrentTime = value
        fire({ target: this, types: ['seeking', 'seeked', 'timeupdate'] })
      },
    },
  })

  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    value: true,
  })
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    writable: true,
    value: null,
  })
  Element.prototype.requestFullscreen = function (this: Element) {
    Object.assign(document, { fullscreenElement: this })
    fire({ target: this, types: ['fullscreenchange'], bubbles: true })
    return Promise.resolve()
  }
  document.exitFullscreen = () => {
    const element = document.fullscreenElement
    Object.assign(document, { fullscreenElement: null })
    if (element) {
      fire({ target: element, types: ['fullscreenchange'], bubbles: true })
    }
    return Promise.resolve()
  }

  window.matchMedia = (query: string) =>
    Object.assign(new EventTarget(), {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList

  return () => {
    EventTarget.prototype.addEventListener = prototypeAddEventListener
    window.addEventListener = windowAddEventListener
    window.ResizeObserver = ResizeObserver
    restoreIntersectionObserver()
    ;[
      'canPlayType',
      'load',
      'play',
      'pause',
      'muted',
      'volume',
      'currentTime',
    ].forEach((key) => {
      if (mediaDescriptors[key]) {
        Object.defineProperty(mediaPrototype, key, mediaDescriptors[key])
      } else {
        delete mediaPrototype[key as keyof HTMLMediaElement]
      }
    })
    Element.prototype.requestFullscreen = requestFullscreen
    document.exitFullscreen = exitFullscreen
    Object.entries(fullscreenDescriptors).forEach(([key, descriptor]) => {
      if (descriptor) {
        Object.defineProperty(document, key, descriptor)
      } else {
        delete document[key as keyof Document]
      }
    })
    window.matchMedia = matchMedia
  }
}
