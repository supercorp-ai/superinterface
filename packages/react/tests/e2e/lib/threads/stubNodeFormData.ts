import { vi } from 'vitest'
import { File as NodeFile } from 'node:buffer'

// jsdom replaces FormData and File with its own, which Node's fetch does
// not recognize (it would send the string "[object FormData]"). Uploads go
// to the real server through Node's fetch, so use Node's FormData while the
// test runs, and build uploaded files with the returned Node `File`.
// Undo with `vi.unstubAllGlobals()`.
export const stubNodeFormData = async () => {
  const nodeFormData = await new Response('', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  }).formData()
  vi.stubGlobal('FormData', nodeFormData.constructor)

  return { File: NodeFile }
}
