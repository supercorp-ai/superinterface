import { detect } from 'detect-browser'

const unsupportedNames = [
  'safari',
  'ios',
]

export const isHtmlAudioSupported = !unsupportedNames.includes(detect()?.name || '')
