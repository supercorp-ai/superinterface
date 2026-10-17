// jsdom has no IntersectionObserver. This one reports every observed element
// as visible, as a browser would for elements inside the viewport. Returns a
// function that restores jsdom.
export const emulateIntersectionObserver = () => {
  const { IntersectionObserver } = window

  window.IntersectionObserver = class {
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting: true, intersectionRatio: 1 }] as never,
        this as never,
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as never

  return () => {
    window.IntersectionObserver = IntersectionObserver
  }
}
