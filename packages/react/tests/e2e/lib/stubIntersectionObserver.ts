type Observation = {
  observer: IntersectionObserver
  callback: IntersectionObserverCallback
  target: Element
}

// jsdom has no IntersectionObserver. This stand-in records what is observed;
// `reveal()` reports every observed element as fully visible, as if the user
// scrolled it into view.
export const stubIntersectionObserver = () => {
  const globals = globalThis as unknown as Record<string, unknown>
  const original = globals.IntersectionObserver
  const observations = new Set<Observation>()

  class RecordingIntersectionObserver {
    readonly root = null
    readonly rootMargin = '0px'
    readonly thresholds = [0]

    constructor(private callback: IntersectionObserverCallback) {}

    observe(target: Element) {
      observations.add({
        observer: this as unknown as IntersectionObserver,
        callback: this.callback,
        target,
      })
    }

    unobserve(target: Element) {
      observations.forEach((observation) => {
        if (observation.target === target) observations.delete(observation)
      })
    }

    disconnect() {
      observations.forEach((observation) => {
        if (observation.observer === (this as unknown)) {
          observations.delete(observation)
        }
      })
    }

    takeRecords() {
      return []
    }
  }

  globals.IntersectionObserver = RecordingIntersectionObserver
  window.IntersectionObserver =
    RecordingIntersectionObserver as unknown as typeof IntersectionObserver

  return {
    observedCount: () => observations.size,
    reveal: () =>
      [...observations].forEach(({ observer, callback, target }) =>
        callback(
          [
            {
              target,
              isIntersecting: true,
              intersectionRatio: 1,
              time: 0,
              boundingClientRect: target.getBoundingClientRect(),
              intersectionRect: target.getBoundingClientRect(),
              rootBounds: null,
            },
          ],
          observer,
        ),
      ),
    restore: () => {
      globals.IntersectionObserver = original
      window.IntersectionObserver = original as typeof IntersectionObserver
    },
  }
}
