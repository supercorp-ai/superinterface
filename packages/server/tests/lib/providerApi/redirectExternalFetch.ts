const localHosts = ['127.0.0.1', 'localhost', '[::1]']

const inputUrl = ({ input }: { input: RequestInfo | URL }) => {
  if (typeof input === 'string') return new URL(input)
  if (input instanceof URL) return input
  return new URL(input.url)
}

// Rewrites every global `fetch` aimed at a non-local host to
// `<origin>/<original host><original path>`, so provider SDKs that hardcode
// their base URL (Together, Mistral, OpenRouter, Google, ...) talk to a local
// fake server instead of the real service. Returns a restore function.
export const redirectExternalFetch = ({ origin }: { origin: string }) => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = inputUrl({ input })

    if (localHosts.includes(url.hostname)) {
      return originalFetch(input, init)
    }

    const redirectedUrl = `${origin}/${url.host}${url.pathname}${url.search}`

    if (input instanceof Request) {
      return originalFetch(
        new Request(redirectedUrl, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          signal: input.signal,
          // @ts-expect-error duplex is not yet in the types
          duplex: 'half',
        }),
        init,
      )
    }

    return originalFetch(redirectedUrl, init)
  }

  return () => {
    globalThis.fetch = originalFetch
  }
}
