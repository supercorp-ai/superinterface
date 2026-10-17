// Sends requests for `from` (an origin such as https://api.replicate.com) to a
// local fake instead. SDKs that capture `globalThis.fetch` at construction
// time pick this up when they are built after the redirect is installed.
export const redirectGlobalFetch = ({
  from,
  to,
}: {
  from: string
  to: string
}) => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      input instanceof Request ? input.url : new URL(String(input)).toString()
    if (!url.startsWith(from)) return originalFetch(input, init)

    const redirected = `${to}${url.slice(from.length)}`
    if (input instanceof Request) {
      return originalFetch(new Request(redirected, input), init)
    }
    return originalFetch(redirected, init)
  }

  return {
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }
}
