// Makes a media element behave as if the browser loaded `duration` seconds
// of seekable media: sets its state and fires the loading events (jsdom never
// loads media).
export const loadMedia = ({
  media,
  duration,
}: {
  media: HTMLMediaElement
  duration: number
}) => {
  const ranges = { length: 1, start: () => 0, end: () => duration }

  Object.defineProperties(media, {
    duration: { configurable: true, value: duration },
    readyState: { configurable: true, value: 4 },
    networkState: { configurable: true, value: 1 },
    seekable: { configurable: true, value: ranges },
    buffered: { configurable: true, value: ranges },
  })

  for (const type of [
    'loadstart',
    'durationchange',
    'loadedmetadata',
    'loadeddata',
    'canplay',
    'canplaythrough',
  ]) {
    media.dispatchEvent(new Event(type))
  }
}
