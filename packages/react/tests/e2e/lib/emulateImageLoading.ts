// jsdom never loads images, so components that wait for an image to load
// (like Radix avatars) never show it. This fires `load` for every image
// source that is set, as a browser would once the image arrives, and keeps
// the requested sources. Returns a function that restores jsdom's behavior.
export const emulateImageLoading = () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    'src',
  )!
  const requested: string[] = []

  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() {
      return descriptor.get!.call(this)
    },
    set(value: string) {
      descriptor.set!.call(this, value)
      requested.push(value)
      setTimeout(() => this.dispatchEvent(new Event('load')))
    },
  })

  return {
    requested,
    restore: () =>
      Object.defineProperty(HTMLImageElement.prototype, 'src', descriptor),
  }
}
