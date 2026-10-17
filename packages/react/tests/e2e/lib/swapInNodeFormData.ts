// The e2e tests send requests with Node's fetch, which only understands
// Node's own FormData, not jsdom's. This swaps the global FormData for
// Node's, as a browser's fetch and FormData work together. Returns a
// function that restores jsdom's FormData.
export const swapInNodeFormData = async () => {
  const jsdomFormData = globalThis.FormData
  const nodeFormData = (
    await new Response('', {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }).formData()
  ).constructor as typeof FormData

  globalThis.FormData = nodeFormData

  return () => {
    globalThis.FormData = jsdomFormData
  }
}
