export const isIframe = () => {
  if (typeof window === 'undefined') return false

  return window.self !== window.top
}
